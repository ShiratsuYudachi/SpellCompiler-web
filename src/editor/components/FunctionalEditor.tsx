// =============================================
// Functional Workflow Editor
//
// =============================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	addEdge,
	useReactFlow,
	ReactFlowProvider,
	useNodesState,
	useEdgesState,
	type Connection,
	type Edge,
	type EdgeChange,
	type Node,
	type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Alert, Button, Group, Paper, Text, TextInput, Modal, Badge } from '@mantine/core';

import { LiteralNode } from './nodes/LiteralNode';
import { DynamicFunctionNode } from './nodes/DynamicFunctionNode';
import { CustomFunctionNode } from './nodes/CustomFunctionNode';
import { ApplyFuncNode } from './nodes/ApplyFuncNode';
import { IfNode } from './nodes/IfNode';
import { OutputNode } from './nodes/OutputNode';
import { LambdaDefNode } from './nodes/LambdaDefNode';
import { FunctionOutNode } from './nodes/FunctionOutNode';
import { VectorNode } from './nodes/VectorNode';

import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { ASTVisualizer } from './ASTVisualizer';
import type { ASTNode } from '../ast/ast';
import type { FunctionInfo } from '../utils/getFunctionRegistry';
import { EditorProvider } from '../contexts/EditorContext';
import { NodeSelectionMenu } from './menus/NodeSelectionMenu';
import { ContextMenu } from './menus/ContextMenu';
import type { EventBinding } from '../../game/events/EventQueue'
import { getEditorContext, getGameInstance, subscribeEditorContext } from '../../game/gameInstance'
import { updateSpellInCache, invalidateSpellCache } from '../../game/systems/eventProcessSystem'
import { levelRegistry } from '../../game/levels/LevelRegistry'
import { upsertSpell, loadSpell } from '../utils/spellStorage'
import { registerGameFunctions } from '../library/game'
import { SpellInputNode } from './nodes/SpellInputNode'
import { AddEventPanel } from './AddEventPanel'
import { EventListPanel } from './EventListPanel'
import { useEditorClipboard } from './hooks/useEditorClipboard'
import { useEditorShortcut } from './hooks/useEditorShortcut'
import { VibePanel } from './VibePanel'
import { vibeBuild, vibeAsk, MOCK_MODEL_ID, type LevelContext } from '../../lib/vibe/vibeApi'
import type { LevelMeta } from '../../game/levels/LevelRegistry'

// Define node types
const nodeTypes = {
	literal: LiteralNode,
	dynamicFunction: DynamicFunctionNode,
	customFunction: CustomFunctionNode,
	applyFunc: ApplyFuncNode,
	if: IfNode,
	output: OutputNode,
	lambdaDef: LambdaDefNode,
	functionOut: FunctionOutNode,
	vector: VectorNode,
	spellInput: SpellInputNode,
};

type FlowSnapshot = { nodes: Node[]; edges: Edge[] }

export type FunctionalEditorProps = {
	initialFlow?: FlowSnapshot
	initialSpellId?: string | null
	initialSpellName?: string
	onExit?: () => void
	backButtonText?: string
	isLibraryMode?: boolean
	onBeforeExit?: () => void
	levelMeta?: LevelMeta
}

const defaultNewFlow: FlowSnapshot = {
	nodes: [
		{
			id: 'output-1',
			type: 'output',
			position: { x: 560, y: 220 },
			data: { label: 'Output' },
		},
		{
			id: 'lit-1',
			type: 'literal',
			position: { x: 260, y: 220 },
			data: { value: 0 },
		},
	],
	edges: [{ id: 'e1', source: 'lit-1', target: 'output-1', targetHandle: 'value' }],
}

let nodeIdCounter = 100;

function bumpNodeIdCounterFromNodes(nodes: Node[]) {
	let maxId = nodeIdCounter
	for (const node of nodes) {
		const match = node.id.match(/-(\d+)$/)
		if (!match) continue
		const num = parseInt(match[1], 10)
		if (num >= maxId) {
			maxId = num + 1
		}
	}
	nodeIdCounter = maxId
}

type FlowState = { nodes: Node[]; edges: Edge[] };

// Controlled nodes/edges so that setNodes/setEdges (e.g. from Vibe Build) reliably update the view.
function EditorContent(props: FunctionalEditorProps) {
	const isLibraryMode = props.isLibraryMode ?? Boolean(props.onExit && props.initialSpellId !== null)
	const editorShortcutsHint = useMemo(() => {
		const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/i.test(navigator.platform)
		const mod = mac ? '⌘' : 'Ctrl'
		const parts = [
			'Pan: drag empty canvas',
			'Box select: Shift+drag',
			`Copy/Paste: ${mod}+C / ${mod}+V`,
			'Delete: Backspace',
			`Undo/Redo: ${mod}+Z / ${mod}+Shift+Z`,
			`Add node: right click`,
		]
		const levelLinkedSpell =
			props.initialSpellId != null && /^scene-spell-.+/.test(props.initialSpellId)
		if (!isLibraryMode || (isLibraryMode && levelLinkedSpell && getGameInstance())) {
			parts.push('Tab: return to game')
		}
		return parts.join(' · ')
	}, [isLibraryMode, props.initialSpellId])
	const startingFlow = props.initialFlow || (isLibraryMode ? defaultNewFlow : null)
	const initialNodes = useMemo(() => startingFlow?.nodes ?? defaultNewFlow.nodes, [startingFlow]);
	const initialEdges = useMemo(() => startingFlow?.edges ?? defaultNewFlow.edges, [startingFlow]);

	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Sync to initial flow when opening a different spell
	useEffect(() => {
		setNodes(initialNodes);
		setEdges(initialEdges);
	}, [initialNodes, initialEdges, setNodes, setEdges]);

	// Custom undo/redo - sync with React Flow instance, no state updates during drag
	const pastRef = useRef<FlowState[]>([]);
	const futureRef = useRef<FlowState[]>([]);
	const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
	const historyAllowedRef = useRef(false);
	const [hasUserActed, setHasUserActed] = useState(false);

	const { getNodes, getEdges, screenToFlowPosition, getNode, toObject } = useReactFlow();

	const pushUndo = useCallback(() => {
		const nodes = getNodes();
		const edges = getEdges();
		pastRef.current = pastRef.current.slice(-49).concat([{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }]);
		futureRef.current = [];
		setUndoState({ canUndo: true, canRedo: false });
	}, [getNodes, getEdges]);

	const undo = useCallback(() => {
		if (pastRef.current.length === 0) return;
		const prev = pastRef.current.pop()!;
		futureRef.current = [{ nodes: JSON.parse(JSON.stringify(getNodes())), edges: JSON.parse(JSON.stringify(getEdges())) }, ...futureRef.current];
		setNodes(prev.nodes);
		setEdges(prev.edges);
		setUndoState({ canUndo: pastRef.current.length > 0, canRedo: true });
	}, [getNodes, getEdges, setNodes, setEdges]);

	const redo = useCallback(() => {
		if (futureRef.current.length === 0) return;
		const next = futureRef.current.shift()!;
		pastRef.current = pastRef.current.concat([{ nodes: JSON.parse(JSON.stringify(getNodes())), edges: JSON.parse(JSON.stringify(getEdges())) }]);
		setNodes(next.nodes);
		setEdges(next.edges);
		setUndoState({ canUndo: true, canRedo: futureRef.current.length > 0 });
	}, [getNodes, getEdges, setNodes, setEdges]);

	const [saveTrigger, setSaveTrigger] = useState(0);
	const triggerSave = useCallback(() => setSaveTrigger((s) => s + 1), []);

	// Push state BEFORE drag (at start) - if we push at stop, we'd save state after drag and undo would do nothing
	const onDragStart = useCallback(() => {
		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();
	}, [pushUndo]);

	const onNodeDragStop = useCallback(() => {
		triggerSave();
	}, [triggerSave]);

	// Always ensure we have a spellId (both Library and Game mode need it for saving)
	const [spellId, setSpellId] = useState<string | null>(() => {
		if (props.initialSpellId) return props.initialSpellId
		// Create a temporary ID immediately for new workflows (both modes)
		const tempId = `spell-${Date.now()}`
		console.log('[Editor] Created new spell ID:', tempId)
		return tempId
	})
	const [spellName, setSpellName] = useState<string>(props.initialSpellName || 'New Spell')

	const [evaluationResult, setEvaluationResult] = useState<any>(null);
	const [currentAST, setCurrentAST] = useState<ASTNode | null>(null);
	const [currentFunctions, setCurrentFunctions] = useState<import('../ast/ast').FunctionDefinition[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [menuState, setMenuState] = useState<{
		show: boolean;
		position: { x: number; y: number };
		sourceNodeId?: string;
		sourceHandleId?: string;
	} | null>(null);
	const [addEventModalOpen, setAddEventModalOpen] = useState(false);
	const [eventListModalOpen, setEventListModalOpen] = useState(false);
    const [editingBinding, setEditingBinding] = useState<EventBinding | null>(null);
	const [contextMenu, setContextMenu] = useState<{
		show: boolean;
		position: { x: number; y: number };
		nodeId?: string;
	} | null>(null);
	const [editorContext, setEditorContext] = useState<{ sceneKey?: string; refreshId?: number } | null>(() => getEditorContext());
	const [workflowLoaded, setWorkflowLoaded] = useState(false);
	// compiled = has saved AST; draft = no build yet (neutral); failed = last Compile & Save errored
	const [compilationStatus, setCompilationStatus] = useState<'compiled' | 'draft' | 'failed'>(() => {
		const sid = props.initialSpellId
		if (sid) {
			const s = loadSpell(sid)
			if (s?.hasCompiledAST) return 'compiled'
			if (s?.compilationFailed) return 'failed'
		}
		return 'draft'
	})

	// Keep badge in sync when spellId is adopted (e.g. game mode) or save data updates
	useEffect(() => {
		if (!spellId) return
		const s = loadSpell(spellId)
		setCompilationStatus(
			s?.hasCompiledAST ? 'compiled' : s?.compilationFailed ? 'failed' : 'draft',
		)
	}, [spellId])

	const clearCompileErrorOnGraphEdit = useCallback(() => {
		setCompilationStatus((prev) => (prev === 'failed' ? 'draft' : prev))
		setError((e) => (e === 'Compilation failed' ? null : e))
	}, [])

	const VIBE_PANEL_WIDTH_KEY = 'spellcompiler-vibe-panel-width';
	const [vibePanelWidth, setVibePanelWidth] = useState(() => {
		try {
			const w = parseInt(localStorage.getItem(VIBE_PANEL_WIDTH_KEY) ?? '', 10);
			if (Number.isFinite(w) && w >= 200 && w <= 600) return w;
		} catch { /* ignore */ }
		return 320;
	});
	const vibeResizeStartRef = useRef<{ startX: number; startW: number } | null>(null);

	const onVibeResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		vibeResizeStartRef.current = { startX: e.clientX, startW: vibePanelWidth };
		const onMove = (ev: MouseEvent) => {
			const r = vibeResizeStartRef.current;
			if (!r) return;
			const delta = r.startX - ev.clientX;
			const next = Math.max(200, Math.min(600, r.startW + delta));
			vibeResizeStartRef.current = { startX: ev.clientX, startW: next };
			setVibePanelWidth(next);
			try { localStorage.setItem(VIBE_PANEL_WIDTH_KEY, String(next)); } catch { /* ignore */ }
		};
		const onUp = () => {
			vibeResizeStartRef.current = null;
			document.removeEventListener('mousemove', onMove);
			document.removeEventListener('mouseup', onUp);
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		};
		document.addEventListener('mousemove', onMove);
		document.addEventListener('mouseup', onUp);
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	}, [vibePanelWidth]);

	const generateNodeId = useCallback(() => `node-${nodeIdCounter++}`, []);

	// Subscribe to editor context changes and load workflow (ONLY in game mode)
	useEffect(() => {
		// Skip this effect entirely in library mode
		if (isLibraryMode) {
			console.log('[Editor] Library mode: skipping sceneKey-based workflow loading')
			return
		}

		const unsubscribe = subscribeEditorContext((context) => {
			const newSceneKey = context?.sceneKey;
			const newRefreshId = context?.refreshId;

			// Only reload workflow if scene key actually changed OR refreshId changed (for config updates)
			if (editorContext?.sceneKey === newSceneKey &&
			    editorContext?.refreshId === newRefreshId &&
			    workflowLoaded) {
				return;
			}

			setEditorContext(context);

			// Load workflow: prefer user's saved working copy; fall back to level template
			console.log('[Editor] Game mode: loading workflow for sceneKey:', newSceneKey)

			try {
				const config = newSceneKey ? levelRegistry.get(newSceneKey) : null;

				// Check if player has a saved working copy for this scene
				const sceneSpellId = newSceneKey ? `scene-spell-${newSceneKey}` : null;
				const savedSpell = sceneSpellId ? loadSpell(sceneSpellId) : null;

				let nodesToLoad = savedSpell
					? ((savedSpell.flow as { nodes: Node[]; edges: Edge[] } | null)?.nodes ?? [])
					: (config?.initialSpellWorkflow?.nodes ?? []);
				let edgesToLoad = savedSpell
					? ((savedSpell.flow as { nodes: Node[]; edges: Edge[] } | null)?.edges ?? [])
					: (config?.initialSpellWorkflow?.edges ?? []);

				if (nodesToLoad.length === 0 && edgesToLoad.length === 0) {
					nodesToLoad = defaultNewFlow.nodes
					edgesToLoad = defaultNewFlow.edges
				}

				console.log('[Editor] Game mode: loading workflow, nodes:', nodesToLoad.length, savedSpell ? '(from saved copy)' : '(from template)')
				setNodes(nodesToLoad);
				setEdges(edgesToLoad);

				// Adopt stable spell ID so auto-save targets the same slot
				if (sceneSpellId) {
					setSpellId(sceneSpellId);
				}

				// Update nodeIdCounter to avoid conflicts
				let maxId = nodeIdCounter;
				nodesToLoad.forEach((node: Node) => {
					const match = node.id.match(/-(\d+)$/);
					if (match) {
						const num = parseInt(match[1], 10);
						if (num >= maxId) maxId = num + 1;
					}
				});
				nodeIdCounter = maxId;
			} catch (err) {
				console.error('[Editor] Failed to load workflow:', err);
				setNodes([{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: {} }]);
				setEdges([]);
			}

			setWorkflowLoaded(true);
		});

		return unsubscribe;
	}, [editorContext, workflowLoaded, isLibraryMode, setNodes, setEdges]);

	// Auto-save: trigger on flow changes (saveTrigger incremented by drag stop, add, delete, connect)
	// Runs in both library mode and scene-config mode (whenever spellId is set)
	useEffect(() => {
		if (!spellId) return
		const timeoutId = setTimeout(() => {
			try {
				const nodes = getNodes();
				const edges = getEdges();
				const { hasCompiledAST, compilationFailed } = upsertSpell({
					id: spellId,
					name: spellName,
					flow: { nodes, edges },
					compile: false,
				});
				if (!hasCompiledAST) {
					invalidateSpellCache(spellId);
				}
				setCompilationStatus(() => {
					if (hasCompiledAST) return 'compiled'
					if (compilationFailed) return 'failed'
					return 'draft'
				})
			} catch (err) {
				console.error('[Editor] Failed to auto-save:', err);
			}
		}, 1000);
		return () => clearTimeout(timeoutId);
	}, [saveTrigger, spellId, spellName, getNodes, getEdges]);
	useEffect(() => {
		if (!startingFlow) return
		bumpNodeIdCounterFromNodes(startingFlow.nodes)
	}, [startingFlow])

	const forceSave = useCallback(() => {
		if (!spellId) return;
		try {
			const nodes = getNodes();
			const edges = getEdges();
			const { hasCompiledAST, compilationFailed } = upsertSpell({
				id: spellId,
				name: spellName,
				flow: { nodes, edges },
				compile: false,
			});
			if (!hasCompiledAST) {
				invalidateSpellCache(spellId);
			}
			setCompilationStatus(() => {
				if (hasCompiledAST) return 'compiled'
				if (compilationFailed) return 'failed'
				return 'draft'
			})
		} catch (err) {
			console.error('[Editor] Force save failed:', err);
		}
	}, [spellId, spellName, getNodes, getEdges]);

	// Save on component unmount
	useEffect(() => {
		return () => {
			console.log('[Editor] Component unmounting, force saving...')
			forceSave()
		}
	}, [forceSave])

	// Expose force save to parent via onBeforeExit
	useEffect(() => {
		if (props.onBeforeExit) {
			// Call onBeforeExit with force save
			// This allows parent to trigger save before closing
		}
	}, [props.onBeforeExit])

	const onNodesChangeWrapped = useCallback(
		(changes: NodeChange[]) => {
			const meaningful = changes.some(
				(c) => c.type !== 'select' && c.type !== 'dimensions'
			)
			if (meaningful) clearCompileErrorOnGraphEdit()
			onNodesChange(changes)
		},
		[onNodesChange, clearCompileErrorOnGraphEdit]
	)

	const onEdgesChangeWrapped = useCallback(
		(changes: EdgeChange[]) => {
			const meaningful = changes.some((c) => c.type !== 'select')
			if (meaningful) clearCompileErrorOnGraphEdit()
			onEdgesChange(changes)
		},
		[onEdgesChange, clearCompileErrorOnGraphEdit]
	)

	const onConnect = useCallback(
		(params: Connection) => {
			clearCompileErrorOnGraphEdit()
			historyAllowedRef.current = true;
			setHasUserActed(true);
			pushUndo();
			setEdges((eds) => addEdge(params, eds));
			triggerSave();
		},
		[setEdges, pushUndo, triggerSave, clearCompileErrorOnGraphEdit]
	);

	// Handle click on source handle to show menu
	const handleHandleAddNode = useCallback((nodeId: string, handleId: string, event: React.MouseEvent) => {
		const node = getNode(nodeId);
		if (!node) return;

		// Use mouse position for menu
		const menuX = event.clientX;
		const menuY = event.clientY;

		setMenuState({
			show: true,
			position: { x: menuX, y: menuY },
			sourceNodeId: nodeId,
			sourceHandleId: handleId
		});
	}, [getNode]);

	const editorContextValue = useMemo(() => ({
		onHandleAddNode: handleHandleAddNode
	}), [handleHandleAddNode]);

	const handleDeleteSelected = useCallback(() => {
		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();
		const nodes = getNodes();
		const edges = getEdges();
		const nodesToDelete = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
		setNodes(nodes.filter((n) => !n.selected));
		setEdges(edges.filter((e) => {
			if (e.selected) return false;
			if (nodesToDelete.has(e.source) || nodesToDelete.has(e.target)) return false;
			return true;
		}));
		triggerSave();
	}, [getNodes, getEdges, setNodes, setEdges, pushUndo, triggerSave]);

	const applyPaste = useCallback(
		(newNodes: Node[], newEdges: Edge[]) => {
			historyAllowedRef.current = true;
			setHasUserActed(true);
			pushUndo();
			setNodes((nds) => [...nds, ...newNodes]);
			setEdges((eds) => [...eds, ...newEdges]);
			triggerSave();
		},
		[setNodes, setEdges, pushUndo, triggerSave]
	);

	// Stable handlers for ReactFlow to avoid re-renders during drag (use ref for latest nodes/edges)
	const onPaneClick = useCallback(() => {
		setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
		setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
		setMenuState(null);
		setContextMenu(null);
	}, [setNodes, setEdges]);
	const onEditorAreaClick = useCallback((e: React.MouseEvent) => {
		setMenuState(null);
		setContextMenu(null);
		// Don't steal focus from input/textarea elements inside nodes
		const target = e.target as HTMLElement;
		if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('[contenteditable="true"]')) {
			return;
		}
		(e.currentTarget as HTMLElement).focus();
	}, []);

	const onEditorAreaContextMenu = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		const selectedNodes = getNodes().filter((n) => n.selected);
		const selectedCount = selectedNodes.length;
		if (selectedCount <= 1) {
			setNodes((n) => n.map((x) => ({ ...x, selected: false })));
			setEdges((x) => x.map((e) => ({ ...e, selected: false })));
		} else {
			const flowClick = screenToFlowPosition({ x: e.clientX, y: e.clientY });
			const margin = 100;
			let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
			for (const node of selectedNodes) {
				const { x, y } = node.position;
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
			const pad = 120;
			const insideOrNear =
				flowClick.x >= minX - margin - pad &&
				flowClick.x <= maxX + margin + pad &&
				flowClick.y >= minY - margin - pad &&
				flowClick.y <= maxY + margin + pad;
			if (!insideOrNear) {
				setNodes((n) => n.map((x) => ({ ...x, selected: false })));
				setEdges((x) => x.map((e) => ({ ...e, selected: false })));
			}
		}
		setContextMenu({ show: true, position: { x: e.clientX, y: e.clientY } });
	}, [setNodes, setEdges, screenToFlowPosition, getNodes]);
	const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
		event.preventDefault();
		event.stopPropagation();
		const othersSelected = getNodes().some((n) => n.selected && n.id !== node.id);
		if (!(node.selected && othersSelected)) {
			setNodes((n) => n.map((x) => ({ ...x, selected: x.id === node.id })));
			setEdges((e) => e.map((x) => ({ ...x, selected: false })));
		}
		setContextMenu({
			show: true,
			position: { x: event.clientX, y: event.clientY },
			nodeId: node.id
		});
	}, [setNodes, setEdges, getNodes]);
	const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
		event.preventDefault();
		event.stopPropagation();
		setNodes((n) => n.map((x) => ({ ...x, selected: false })));
		setEdges((e) => e.map((x) => ({ ...x, selected: x.id === edge.id })));
		setContextMenu({
			show: true,
			position: { x: event.clientX, y: event.clientY }
		});
	}, [setNodes, setEdges]);

	const { canPaste, handleCopy, handlePaste } = useEditorClipboard({
		getNodes,
		getEdges,
		setNodes,
		setEdges,
		applyPaste,
		contextMenuPosition: contextMenu?.position,
		screenToFlowPosition,
		generateNodeId,
		setError,
	});

	useEditorShortcut({
		onCopy: handleCopy,
		onPaste: handlePaste,
		onDelete: handleDeleteSelected,
		onUndo: undo,
		onRedo: redo,
	});

	// Add function node from menu and connect. Position from pane/handle menu (menuState) or right-click context menu (contextMenu).
	const addFunctionNodeFromMenu = (funcInfo: FunctionInfo) => {
		const screenPosition = menuState?.position ?? contextMenu?.position;
		const sourceNodeId = menuState?.sourceNodeId;
		const sourceHandleId = menuState?.sourceHandleId;
		if (!screenPosition && !sourceNodeId) return;

		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();

		const newNodeId = `node-${nodeIdCounter++}`;
		const isVariadic = funcInfo.paramCount === 0 && funcInfo.name.includes('list')

		// Initialize parameter modes if function has them
		const parameterModes = funcInfo.parameterModes ?
			Object.keys(funcInfo.parameterModes).reduce((acc, paramName) => {
				const modes = funcInfo.parameterModes![paramName];
				acc[paramName] = {
					current: 'vector', // Default to vector mode
					options: modes
				};
				return acc;
			}, {} as Record<string, { current: string; options: any[] }>)
			: undefined;

		// If from handle click, position relative to source node
		if (sourceNodeId) {
			const sourceNode = getNode(sourceNodeId);
			if (!sourceNode) return;

			const newNode: Node = {
				id: newNodeId,
				type: 'dynamicFunction',
				position: { x: sourceNode.position.x + 250, y: sourceNode.position.y },
				data: {
					functionName: funcInfo.name,
					displayName: funcInfo.displayName,
					namespace: funcInfo.namespace,
					params: funcInfo.params,
					isVariadic,
					parameterModes
				}
			};

			setNodes((nds) => [...nds, newNode]);

			if (isVariadic || funcInfo.params.length > 0) {
				const newEdge: Edge = {
					id: `e-${Date.now()}`,
					source: sourceNodeId,
					sourceHandle: sourceHandleId!,
					target: newNodeId,
					targetHandle: 'arg0'
				};
				setEdges((eds) => [...eds, newEdge]);
			}
		} else {
			// From pane click or right-click context menu: position at menu location
			if (!screenPosition) return;
			const flowPos = screenToFlowPosition({ x: screenPosition.x, y: screenPosition.y });

			const newNode: Node = {
				id: newNodeId,
				type: 'dynamicFunction',
				position: flowPos,
				data: {
					functionName: funcInfo.name,
					displayName: funcInfo.displayName,
					namespace: funcInfo.namespace,
					params: funcInfo.params,
					isVariadic,
					parameterModes
				}
			};

			setNodes((nds) => [...nds, newNode]);
		}

		triggerSave();
		setMenuState(null);
		setContextMenu(null);
	};

	// Add basic node from menu. Position from pane/handle menu (menuState) or right-click context menu (contextMenu).
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => {
		const screenPosition = menuState?.position ?? contextMenu?.position;
		const sourceNodeId = menuState?.sourceNodeId;
		const sourceHandleId = menuState?.sourceHandleId;
		if (!screenPosition && !sourceNodeId) return;

		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();

		// Check if node type is allowed
		const sceneConfig = editorContext?.sceneKey ? levelRegistry.get(editorContext.sceneKey) : undefined
		const allowedNodeTypes = sceneConfig?.allowedNodeTypes
		if (allowedNodeTypes && !allowedNodeTypes.includes(type)) {
			setError(`Node type "${type}" is not allowed in this level.`)
			setMenuState(null)
			setContextMenu(null)
			return
		}

		const newNodeId = `node-${nodeIdCounter++}`;

		// Determine default data for the node
		const getDefaultData = () => {
		switch (type) {
			case 'literal':
				return { value: 0 };
			case 'vector':
				return { x: 0, y: 0 };
			case 'lambdaDef':
				return { functionName: 'lambda', paramCount: 1, params: ['arg0'] };
			case 'customFunction':
				return { functionName: 'myFunc', paramCount: 1 };
			case 'applyFunc':
				return { paramCount: 1 };
			case 'spellInput':
				return { label: 'Spell Input', params: ['state'] };
			default:
				return {};
		}
		};

		// If from handle click, position relative to source node
		if (sourceNodeId) {
			const sourceNode = getNode(sourceNodeId);
			if (!sourceNode) return;

			const newNode: Node = {
				id: newNodeId,
				type,
				position: { x: sourceNode.position.x + 250, y: sourceNode.position.y },
				data: getDefaultData()
			};

			// For lambdaDef, also create a paired functionOut (return) node
			if (type === 'lambdaDef') {
				const returnNodeId = `node-${nodeIdCounter++}`;
				const returnNode: Node = {
					id: returnNodeId,
					type: 'functionOut',
					position: { x: sourceNode.position.x + 250, y: sourceNode.position.y + 120 },
					data: { lambdaId: newNodeId }
				};
				setNodes((nds) => [...nds, newNode, returnNode]);
			} else {
				setNodes((nds) => [...nds, newNode]);
			}

			// Create edge
			const getTargetHandle = () => {
				if (type === 'if') return 'condition';
				if (type === 'customFunction') return 'arg0';
				return 'value';
			};
			const newEdge: Edge = {
				id: `e-${Date.now()}`,
				source: sourceNodeId,
				sourceHandle: sourceHandleId!,
				target: newNodeId,
				targetHandle: getTargetHandle()
			};
			setEdges((eds) => [...eds, newEdge]);
		} else {
			// From pane click or right-click context menu: position at menu location
			if (!screenPosition) return;
			const flowPos = screenToFlowPosition({ x: screenPosition.x, y: screenPosition.y });

			const newNode: Node = {
				id: newNodeId,
				type,
				position: flowPos,
				data: getDefaultData()
			};

			// For lambdaDef, also create a paired functionOut (return) node
			if (type === 'lambdaDef') {
				const returnNodeId = `node-${nodeIdCounter++}`;
				const returnNode: Node = {
					id: returnNodeId,
					type: 'functionOut',
					position: { x: flowPos.x, y: flowPos.y + 120 },
					data: { lambdaId: newNodeId }
				};
				setNodes((nds) => [...nds, newNode, returnNode]);
			} else {
				setNodes((nds) => [...nds, newNode]);
			}
		}

		triggerSave();
		setMenuState(null);
		setContextMenu(null);
	};

	// Evaluate the workflow
	const handleEvaluate = () => {
		try {
			setError(null);

			console.log('[Evaluate] Starting evaluation...')

		// Convert Flow to Spell IR
		const spell = flowToIR(getNodes(), getEdges());
		console.log('[Evaluate] Generated Spell:', JSON.stringify(spell, null, 2))
		setCurrentAST(spell.body);
		setCurrentFunctions(spell.dependencies);

		// Evaluate IR
		const evaluator = new Evaluator();

		// Register game functions for preview
		registerGameFunctions(evaluator)

		// Register user-defined functions
		spell.dependencies.forEach(fn => {
			evaluator.registerFunction(fn);
		});

		const result = evaluator.evaluate(spell.body, new Map());
		console.log('[Evaluate] Result:', result)

			setEvaluationResult(result);
		} catch (err) {
			console.error('[Evaluate] Error:', err);
			setError(err instanceof Error ? err.message : String(err));
			setEvaluationResult(null);
			setCurrentAST(null);
			setCurrentFunctions([]);
		}
	};

	const handleCompileAndSave = () => {
		try {
			setError(null)
			const name = spellName.trim() || 'New Spell'
			const flow = toObject()

			// Use compiledSpell from upsert — getCompiledSpell(nextId) can miss right after save
			// (timing / no save slot) and falsely show "Compilation failed".
			const { id: nextId, hasCompiledAST, compiledSpell, compilationFailed } = upsertSpell({
				id: spellId,
				name,
				flow,
				compile: true,
			})
			console.log('[Editor] Saved to library:', nextId, 'name:', name)

			setSpellId(nextId)
			setSpellName(name)

			if (hasCompiledAST && compiledSpell) {
				setCompilationStatus('compiled')
				setEvaluationResult({ saved: true, id: nextId, compiled: true })
				updateSpellInCache(nextId, compiledSpell)
			} else if (compilationFailed) {
				setCompilationStatus('failed')
				setError('Compilation failed')
				setEvaluationResult(null)
			} else {
				setCompilationStatus('draft')
				setEvaluationResult(null)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
		}
	}

	// Export workflow to JSON file
	const handleExport = () => {
		try {
			const flow = toObject();
			const dataStr = JSON.stringify(flow, null, 2);
			const blob = new Blob([dataStr], { type: 'application/json' });
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;
			link.download = `workflow-${Date.now()}.json`;
			link.click();

			URL.revokeObjectURL(url);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	// Vibe: frontend-only OpenRouter API; full graph is always sent for Build so model can return complete updated graph (in-place).
	// useMemo so the object reference is stable — avoids unnecessary useCallback rebuilds on every render.
	const levelContext: LevelContext | undefined = useMemo(() =>
		props.levelMeta ? {
			key: props.levelMeta.key,
			objectives: props.levelMeta.objectives,
			hints: props.levelMeta.hints,
			allowedNodeTypes: props.levelMeta.allowedNodeTypes,
			maxSpellCasts: props.levelMeta.maxSpellCasts,
			editorRestrictions: props.levelMeta.editorRestrictions,
		} : undefined,
	[props.levelMeta]);

	const handleVibeGenerate = useCallback(async (userText: string, apiKey?: string, model?: string, options?: { isFullRegen?: boolean }) => {
		const isFullRegen = options?.isFullRegen ?? false;
		console.log('[Vibe] handleVibeGenerate', { model, hasKey: !!apiKey?.trim(), level: levelContext?.key, isFullRegen });
		const useMock = model === MOCK_MODEL_ID;
		if (!useMock && !apiKey?.trim()) throw new Error('API key is required.');
		const currentNodes = getNodes();
		const currentEdges = getEdges();
		// Full regen: don't pass current graph; inject answerSpellWorkflow as structural reference
		const graphOptions = isFullRegen ? undefined : { nodes: currentNodes, edges: currentEdges };
		const effectiveLevelContext = isFullRegen && levelContext && props.levelMeta?.answerSpellWorkflow
			? { ...levelContext, referenceSolution: props.levelMeta.answerSpellWorkflow }
			: levelContext;
		console.log('[Vibe] Calling vibeBuild...');
		const { nodes, edges, summary } = await vibeBuild(userText, apiKey ?? '', model, graphOptions, effectiveLevelContext);
		console.log('[Vibe] vibeBuild done', { nodes: nodes?.length, edges: edges?.length, hasSummary: !!summary });
		return {
			nodes: nodes as Node[],
			edges: edges as Edge[],
			wasUpdate: true, // always replace existing graph
			prevNodeCount: isFullRegen ? 0 : currentNodes.length,
			prevEdgeCount: isFullRegen ? 0 : currentEdges.length,
			summary,
		};
	}, [getNodes, getEdges, levelContext, props.levelMeta]);

	const handleVibeAsk = useCallback(async (userText: string, apiKey?: string, model?: string) => {
		const useMock = model === MOCK_MODEL_ID;
		if (!useMock && !apiKey?.trim()) throw new Error('API key is required.');
		const nodes = getNodes();
		const edges = getEdges();
		return vibeAsk(userText, nodes, edges, apiKey ?? '', model, levelContext);
	}, [getNodes, getEdges, levelContext]);

	const applyVibeFlow = useCallback((
		vibeNodes: Node[],
		vibeEdges: Edge[],
		options?: { replace?: boolean }
	) => {
		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();

		if (options?.replace) {
			// Replace entire graph (e.g. "update the spell") — normalize so ReactFlow never gets invalid shape
			const normNodes: Node[] = vibeNodes.map((n, i) => ({
				...n,
				id: typeof n.id === 'string' ? n.id : `node-${i}`,
				type: (typeof n.type === 'string' ? n.type : 'literal') as Node['type'],
				position: typeof n.position === 'object' && n.position != null && 'x' in n.position && 'y' in n.position
					? { x: Number((n.position as { x: number }).x) || 0, y: Number((n.position as { y: number }).y) || 0 }
					: { x: 0, y: 0 },
				data: (n.data && typeof n.data === 'object' ? n.data : {}) as Record<string, unknown>,
				selected: false,
			}));
			const normEdges: Edge[] = vibeEdges.map((e, i) => ({
				...e,
				id: typeof e.id === 'string' ? e.id : `e-${i}`,
				source: String(e.source ?? ''),
				target: String(e.target ?? ''),
				selected: false,
			}));
			setNodes(normNodes);
			setEdges(normEdges);
			bumpNodeIdCounterFromNodes(normNodes);
		} else {
			// Merge new nodes into existing graph (e.g. empty canvas or "add something")
			const existingNodes = getNodes();
			const existingEdges = getEdges();
			const prefix = `vibe-${Date.now()}-`;
			const idMap = new Map<string, string>();
			const existingOutput = existingNodes.find((n) => n.type === 'output');

			for (const n of vibeNodes) {
				if (n.type === 'output' && existingOutput) {
					idMap.set(n.id, existingOutput.id);
				} else {
					idMap.set(n.id, prefix + n.id);
				}
			}

			const existingMaxX = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.x)) : 0;
			const existingMaxY = existingNodes.length ? Math.max(...existingNodes.map((n) => n.position.y)) : 0;
			const vibeMinX = vibeNodes.length ? Math.min(...vibeNodes.map((n) => n.position.x)) : 0;
			const vibeMinY = vibeNodes.length ? Math.min(...vibeNodes.map((n) => n.position.y)) : 0;
			const offsetX = existingMaxX + 120 - vibeMinX;
			const offsetY = existingMaxY + 80 - vibeMinY;

			const newNodes: Node[] = vibeNodes
				.filter((n) => !(n.type === 'output' && existingOutput))
				.map((n) => ({
					...n,
					id: idMap.get(n.id) ?? n.id,
					position: { x: n.position.x + offsetX, y: n.position.y + offsetY },
				}));

			const newEdges: Edge[] = vibeEdges.map((e) => ({
				...e,
				id: prefix + (e.id || `e-${e.source}-${e.target}`),
				source: idMap.get(e.source) ?? e.source,
				target: idMap.get(e.target) ?? e.target,
			}));

			const existingWithoutOutputIncoming = existingOutput
				? existingEdges.filter((e) => e.target !== existingOutput.id)
				: existingEdges;
			const mergedNodes = [...existingNodes, ...newNodes];
			const mergedEdges = [...existingWithoutOutputIncoming, ...newEdges];
			setNodes(mergedNodes);
			setEdges(mergedEdges);
			bumpNodeIdCounterFromNodes(mergedNodes);
		}

		triggerSave();
		setEvaluationResult(null);
		setCurrentAST(null);
		setCurrentFunctions([]);
		setError(null);
	}, [getNodes, getEdges, setNodes, setEdges, pushUndo, triggerSave]);

	// Import workflow from JSON file
	const handleImport = () => {
		try {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = '.json';

			input.onchange = (e) => {
				const file = (e.target as HTMLInputElement).files?.[0];
				if (!file) return;

				const reader = new FileReader();
				reader.onload = (event) => {
					try {
						const content = event.target?.result as string;
						const flow = JSON.parse(content);
						const importNodes = flow.nodes && Array.isArray(flow.nodes) ? flow.nodes : [];
						const importEdges = flow.edges && Array.isArray(flow.edges) ? flow.edges : [];
						historyAllowedRef.current = true;
						setHasUserActed(true);
						pushUndo();
						setNodes(importNodes);
						setEdges(importEdges);
						triggerSave();
						let maxId = nodeIdCounter;
						importNodes.forEach((node: Node) => {
							const match = node.id.match(/-(\d+)$/);
							if (match) {
								const num = parseInt(match[1], 10);
								if (num >= maxId) maxId = num + 1;
							}
						});
						nodeIdCounter = maxId;
						setEvaluationResult(null);
						setCurrentAST(null);
						setCurrentFunctions([]);
						setError(null);
						setCompilationStatus('draft');
					} catch (err) {
						setError(err instanceof Error ? err.message : String(err));
					}
				};
				reader.readAsText(file);
			};

			input.click();
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	};

	return (
		<EditorProvider value={editorContextValue}>
			<div className="h-screen flex flex-col">
		{/* Header - Row 1 */}
		<Paper shadow="sm" p="md" className="border-b">
			<div className="flex items-center justify-between">
				<Group gap="sm">
					{props.onExit ? (
						<Button size="sm" variant="outline" color="gray" onClick={props.onExit}>
							{props.backButtonText || 'Back'}
						</Button>
					) : null}
					{/* Always show Save button and spell name input (both Library and Game mode) */}
					<TextInput
						data-spell-name-input
						value={spellName}
						onChange={(e) => setSpellName(e.currentTarget.value)}
						placeholder="Spell name"
						size="sm"
					/>
					<Badge
						color={
							compilationStatus === 'compiled'
								? 'green'
								: compilationStatus === 'failed'
									? 'red'
									: 'gray'
						}
						variant="light"
					>
						{compilationStatus === 'compiled'
							? 'Compiled'
							: compilationStatus === 'failed'
								? 'Compilation failed'
								: 'No build yet'}
					</Badge>
				</Group>
				<div className="flex gap-2">
					<Button size="sm" variant="outline" color="gray" onClick={handleImport}>
						📥 Import
					</Button>
					<Button size="sm" variant="outline" color="gray" onClick={handleExport}>
						📤 Export
					</Button>
					<Button size="sm" variant="outline" color="violet" onClick={() => setEventListModalOpen(true)}>
						📡 Event Bindings
					</Button>
					<Button type="button" size="sm" color="blue" onClick={handleCompileAndSave}>
						Compile & Save
					</Button>
				</div>
			</div>
		</Paper>

		<Paper shadow="xs" px="md" py="xs" className="border-b bg-gray-50">
			<Text size="xs" c="dimmed" style={{ lineHeight: 1.55 }}>
				{editorShortcutsHint}
			</Text>
		</Paper>

			{/* Header - Row 2: AST and Results */}
			{(currentAST || error || evaluationResult !== null) && (
				<Paper shadow="sm" p="md" className="border-b">
					<div className="flex gap-4" style={{ maxHeight: '300px' }}>
						{/* AST Visualizer - Left */}
						{currentAST && (
							<div className="flex-1 border rounded-lg bg-white overflow-auto p-4">
								<Text size="lg" fw={700} mb="md">
									📊 AST Structure
								</Text>
								<ASTVisualizer ast={currentAST} functions={currentFunctions} />
							</div>
						)}

						{/* Results - Right */}
						<div className="flex-1 flex flex-col gap-2">
							{error && (
								<Alert color="red" title="Error" className="flex-1 overflow-auto">
									{error}
								</Alert>
							)}

							{evaluationResult !== null && (
								<Alert color="green" title="Result" className="flex-1 overflow-auto">
									<Text size="lg" fw={700}>
										{JSON.stringify(evaluationResult)}
									</Text>
								</Alert>
							)}
						</div>
					</div>
				</Paper>
			)}

			{/* Main content area: flow (left) + resizable vibe panel (right); force LTR so panel stays right */}
			<div className="flex-1 flex flex-nowrap min-h-0 w-full overflow-hidden" style={{ flexDirection: 'row', direction: 'ltr' }}>
				{/* Flow canvas - takes remaining space on the left */}
				<div className="flex-1 min-w-0 relative flex flex-col overflow-hidden" style={{ order: 1 }}>
				{/* React Flow editor - focusable so keyboard shortcuts work after clicking canvas */}
				<div
					className="w-full h-full outline-none flex-1 min-h-0"
					tabIndex={0}
					onContextMenu={onEditorAreaContextMenu}
					onClick={onEditorAreaClick}
				>
					<ReactFlow
						key={props.initialSpellId ?? 'new'}
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChangeWrapped}
						onEdgesChange={onEdgesChangeWrapped}
						onPaneClick={onPaneClick}
						onNodeContextMenu={onNodeContextMenu}
						onEdgeContextMenu={onEdgeContextMenu}
						onNodeDragStart={onDragStart}
						onNodeDragStop={onNodeDragStop}
						onSelectionDragStart={onDragStart}
						onSelectionDragStop={onNodeDragStop}
						onConnect={onConnect}
						nodeTypes={nodeTypes}
						fitView
					// Touchpad support
					panOnScroll={true}
					zoomOnScroll={true}
					zoomOnPinch={true}
					// Default RF behaviour: left-drag on empty pane = pan. Shift+drag on pane = selection box.
					// Click/drag on nodes & edges = select (elementsSelectable). Cmd/Ctrl+click = add to selection.
					panOnDrag={true}
					selectionOnDrag={false}
						minZoom={0.1}
						maxZoom={4}
					>
						<Background />
						<Controls />
						<MiniMap />
					</ReactFlow>
				</div>
				</div>

		{/* Node Selection Menu */}
		{menuState && menuState.show && (
			<NodeSelectionMenu
				position={menuState.position}
				onSelectFunction={addFunctionNodeFromMenu}
				onSelectBasicNode={addBasicNodeFromMenu}
				onClose={() => setMenuState(null)}
				editorContext={editorContext}
			/>
		)}

		{/* Context Menu */}
		{contextMenu && contextMenu.show && (
			<ContextMenu
				position={contextMenu.position}
				onSelectFunction={addFunctionNodeFromMenu}
				onSelectBasicNode={addBasicNodeFromMenu}
				editorContext={editorContext}
				onCopy={handleCopy}
				onPaste={handlePaste}
				canPaste={canPaste}
				hasNodeSelected={getNodes().some((node: Node) => node.selected)}
				hasEdgeSelected={getEdges().some((edge: Edge) => edge.selected)}
				onDeleteSelected={handleDeleteSelected}
				onUndo={undo}
				onRedo={redo}
				canUndo={hasUserActed && undoState.canUndo}
				canRedo={hasUserActed && undoState.canRedo}
				onEvaluate={() => {
					handleEvaluate();
					setContextMenu(null);
				}}
				onClose={() => setContextMenu(null)}
			/>
		)}
				{/* Right side: resize handle + Vibe panel (fixed on the right, drag to resize) */}
				<div className="flex shrink-0 flex-row h-full" style={{ width: 4 + vibePanelWidth, order: 2, marginLeft: 'auto' }}>
					<div
						role="separator"
						aria-label="Resize Vibe panel"
						onMouseDown={onVibeResizeStart}
						className="shrink-0 w-1 cursor-col-resize bg-gray-300 hover:bg-blue-400 active:bg-blue-500 transition-colors self-stretch"
						style={{ minWidth: 4 }}
					/>
					<aside
						className="shrink-0 h-full border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden"
						style={{ width: vibePanelWidth, minWidth: vibePanelWidth }}
					>
						<div className="p-2 flex-1 min-h-0 flex flex-col overflow-auto">
							<VibePanel
								onGenerate={handleVibeGenerate}
								onApplyFlow={(nodes, edges, options) => applyVibeFlow(nodes as Node[], edges as Edge[], options)}
								onAsk={handleVibeAsk}
							/>
						</div>
					</aside>
				</div>
			</div>

	{/* Event List Modal */}
	<Modal
		opened={eventListModalOpen}
		onClose={() => setEventListModalOpen(false)}
		title="Active Bindings"
		size="lg"
	>
		<EventListPanel
            onAdd={() => {
                setEditingBinding(null)
                setAddEventModalOpen(true)
            }}
            onEdit={(binding) => {
                setEditingBinding(binding)
                setAddEventModalOpen(true)
            }}
        />
	</Modal>

	{/* Add Event Modal */}
	<Modal
		opened={addEventModalOpen}
		onClose={() => {
            setAddEventModalOpen(false)
            setEditingBinding(null)
        }}
		title={editingBinding ? "Edit Event Binding" : "Add Event Binding"}
		size="lg"
        zIndex={300}
	>
		<AddEventPanel
            initialSpellId={spellId}
            binding={editingBinding}
            onClose={() => {
                setAddEventModalOpen(false)
                setEditingBinding(null)
            }}
        />
	</Modal>
			</div>
	</EditorProvider>
	);
}

export function FunctionalEditor(props: FunctionalEditorProps) {
	return (
		<ReactFlowProvider>
			<EditorContent {...props} />
		</ReactFlowProvider>
	);
}
