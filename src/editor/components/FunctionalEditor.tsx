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
	type Connection,
	type Edge,
	type Node,
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
import { getEditorContext, subscribeEditorContext } from '../../game/gameInstance'
import { updateSpellInCache } from '../../game/systems/eventProcessSystem'
import { levelRegistry } from '../../game/levels/LevelRegistry'
import { upsertSpell } from '../utils/spellStorage'
import { registerGameFunctions } from '../library/game'
import { SpellInputNode } from './nodes/SpellInputNode'
import { AddEventPanel } from './AddEventPanel'
import { EventListPanel } from './EventListPanel'
import { useEditorClipboard } from './hooks/useEditorClipboard'
import { useEditorShortcut } from './hooks/useEditorShortcut'
import { VibePanel, type VibeProvider } from './VibePanel'
import { vibeBuild, vibeAsk } from '../../lib/vibe/vibeApi'

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

// Uncontrolled mode: React Flow manages nodes/edges internally during drag - no parent re-renders.
// We only sync to our undo history on explicit actions (drag stop, add, delete, connect).
function EditorContent(props: FunctionalEditorProps) {
	const isLibraryMode = props.isLibraryMode ?? Boolean(props.onExit && props.initialSpellId !== null)
	const startingFlow = props.initialFlow || (isLibraryMode ? defaultNewFlow : null)
	const defaultNodes = useMemo(() => startingFlow?.nodes || defaultNewFlow.nodes, [startingFlow]);
	const defaultEdges = useMemo(() => startingFlow?.edges || defaultNewFlow.edges, [startingFlow]);

	// Custom undo/redo - sync with React Flow instance, no state updates during drag
	const pastRef = useRef<FlowState[]>([]);
	const futureRef = useRef<FlowState[]>([]);
	const [undoState, setUndoState] = useState({ canUndo: false, canRedo: false });
	const historyAllowedRef = useRef(false);
	const [hasUserActed, setHasUserActed] = useState(false);

	const { setNodes, setEdges, getNodes, getEdges, screenToFlowPosition, getNode, toObject } = useReactFlow();

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
	const [compilationStatus, setCompilationStatus] = useState<'compiled' | 'failed' | null>(null);

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

			// Load workflow from scene config default
			console.log('[Editor] Game mode: loading workflow for sceneKey:', newSceneKey)

			try {
				// Always load from scene config
				const config = newSceneKey ? levelRegistry.get(newSceneKey) : null;
				const templateNodes = config?.initialSpellWorkflow?.nodes || [];
				const templateEdges = config?.initialSpellWorkflow?.edges || [];

				console.log('[Editor] Game mode: loading default workflow, nodes:', templateNodes.length)
				setNodes(templateNodes);
				setEdges(templateEdges);

				// Update nodeIdCounter to avoid conflicts
				let maxId = nodeIdCounter;
				templateNodes.forEach((node: Node) => {
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
	useEffect(() => {
		if (!isLibraryMode || !spellId) return
		const timeoutId = setTimeout(() => {
			try {
				const nodes = getNodes();
				const edges = getEdges();
				upsertSpell({ id: spellId, name: spellName, flow: { nodes, edges } });
			} catch (err) {
				console.error('[Editor] Failed to auto-save:', err);
			}
		}, 1000);
		return () => clearTimeout(timeoutId);
	}, [saveTrigger, isLibraryMode, spellId, spellName, getNodes, getEdges]);
	useEffect(() => {
		if (!startingFlow) return
		bumpNodeIdCounterFromNodes(startingFlow.nodes)
	}, [startingFlow])

	const forceSave = useCallback(() => {
		if (!isLibraryMode || !spellId) return;
		try {
			const nodes = getNodes();
			const edges = getEdges();
			upsertSpell({ id: spellId, name: spellName, flow: { nodes, edges } });
		} catch (err) {
			console.error('[Editor] Force save failed:', err);
		}
	}, [isLibraryMode, spellId, spellName, getNodes, getEdges]);

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

	const onConnect = useCallback(
		(params: Connection) => {
			historyAllowedRef.current = true;
			setHasUserActed(true);
			pushUndo();
			setEdges((eds) => addEdge(params, eds));
			triggerSave();
		},
		[setEdges, pushUndo, triggerSave]
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

	// Add function node from menu and connect
	const addFunctionNodeFromMenu = (funcInfo: FunctionInfo) => {
		if (!menuState) return;
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
		if (menuState.sourceNodeId) {
			const sourceNode = getNode(menuState.sourceNodeId);
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
					source: menuState.sourceNodeId,
					sourceHandle: menuState.sourceHandleId!,
					target: newNodeId,
					targetHandle: 'arg0'
				};
				setEdges((eds) => [...eds, newEdge]);
			}
		} else {
			// From context menu, position at menu location
			const flowPos = screenToFlowPosition({ x: menuState.position.x, y: menuState.position.y });

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
	};

	// Add basic node from menu and connect
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => {
		if (!menuState) return;
		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();

		// Check if node type is allowed
		const sceneConfig = editorContext?.sceneKey ? levelRegistry.get(editorContext.sceneKey) : undefined
		const allowedNodeTypes = sceneConfig?.allowedNodeTypes
		if (allowedNodeTypes && !allowedNodeTypes.includes(type)) {
			setError(`Node type "${type}" is not allowed in this level.`)
			setMenuState(null)
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
		if (menuState.sourceNodeId) {
			const sourceNode = getNode(menuState.sourceNodeId);
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
				source: menuState.sourceNodeId,
				sourceHandle: menuState.sourceHandleId!,
				target: newNodeId,
				targetHandle: getTargetHandle()
			};
			setEdges((eds) => [...eds, newEdge]);
		} else {
			// From context menu, position at menu location
			const flowPos = screenToFlowPosition({ x: menuState.position.x, y: menuState.position.y });

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

		// Save spell data (flow already contains nodes with positions)
		const nextId = upsertSpell({
			id: spellId,
			name,
			flow
		})
		console.log('[Editor] Saved to library:', nextId, 'name:', name)

			setSpellId(nextId)
			setSpellName(name)

			// Try to compile
			try {
				const compiledAST = flowToIR(getNodes(), getEdges())
				setCompilationStatus('compiled')
				setEvaluationResult({ saved: true, id: nextId, compiled: true })

                // Update the spell in the game's event system cache
                updateSpellInCache(nextId, compiledAST)
			} catch (compileErr) {
				console.error('[Editor] Compilation failed during save:', compileErr)
				setCompilationStatus('failed')
				setError(compileErr instanceof Error ? compileErr.message : String(compileErr))
				setEvaluationResult({ saved: true, id: nextId, compiled: false })
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

	// Vibe: pure front-end — call LLM from browser (no server)
	const handleVibeGenerate = useCallback(async (userText: string, apiKey?: string, provider?: VibeProvider) => {
		if (!apiKey?.trim()) throw new Error('API key is required.');
		const { nodes: vibeNodes, edges: vibeEdges } = await vibeBuild(userText, apiKey, provider);
		return { nodes: vibeNodes as Node[], edges: vibeEdges as Edge[] };
	}, []);

	const handleVibeAsk = useCallback(async (userText: string, apiKey?: string, provider?: VibeProvider) => {
		if (!apiKey?.trim()) throw new Error('API key is required.');
		const nodes = getNodes();
		const edges = getEdges();
		const { explanation } = await vibeAsk(userText, nodes, edges, apiKey, provider);
		return { explanation };
	}, [getNodes, getEdges]);

	const applyVibeFlow = useCallback((vibeNodes: Node[], vibeEdges: Edge[]) => {
		const existingNodes = getNodes();
		const existingEdges = getEdges();
		const prefix = `vibe-${Date.now()}-`;
		const idMap = new Map<string, string>();
		const vibeOutputNode = vibeNodes.find((n) => n.type === 'output');
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

		// So the vibe graph becomes the main expression: drop existing edges into output, then add new edges
		const existingWithoutOutputIncoming = existingOutput
			? existingEdges.filter((e) => e.target !== existingOutput.id)
			: existingEdges;
		const mergedNodes = [...existingNodes, ...newNodes];
		const mergedEdges = [...existingWithoutOutputIncoming, ...newEdges];

		historyAllowedRef.current = true;
		setHasUserActed(true);
		pushUndo();
		setNodes(mergedNodes);
		setEdges(mergedEdges);
		bumpNodeIdCounterFromNodes(mergedNodes);
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
					{compilationStatus && (
						<Badge color={compilationStatus === 'compiled' ? 'green' : 'red'} variant="light">
							{compilationStatus === 'compiled' ? 'Compiled' : 'Compilation Failed'}
						</Badge>
					)}
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
					<Button size="sm" color="blue" onClick={handleCompileAndSave}>
						Compile & Save
					</Button>
				</div>
			</div>
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
						defaultNodes={defaultNodes}
						defaultEdges={defaultEdges}
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
					panOnDrag={false}
					selectionOnDrag={true}
						// Better UX
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
								onApplyFlow={(nodes, edges) => applyVibeFlow(nodes as Node[], edges as Edge[])}
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
