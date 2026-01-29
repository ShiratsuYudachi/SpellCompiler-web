// =============================================
// Functional Workflow Editor
// 
// =============================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useUndoable from 'use-undoable';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	addEdge,
	applyNodeChanges,
	applyEdgeChanges,
	useReactFlow,
	ReactFlowProvider,
	type Connection,
	type Edge,
	type Node,
	type NodeChange,
	type EdgeChange,
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

function EditorContent(props: FunctionalEditorProps) {
	const isLibraryMode = props.isLibraryMode ?? Boolean(props.onExit && props.initialSpellId !== null)
	const startingFlow = props.initialFlow || (isLibraryMode ? defaultNewFlow : null)
	const initialFlowState: FlowState = useMemo(
		() => ({
			nodes: startingFlow?.nodes || [],
			edges: startingFlow?.edges || [],
		}),
		[]
	);

	const [flowState, setFlowState, { undo, redo, canUndo, canRedo }] = useUndoable<FlowState>(initialFlowState, {
		historyLimit: 50,
		ignoreIdenticalMutations: false,
		cloneState: true,
	});

	const nodes = flowState.nodes;
	const edges = flowState.edges;

	// Keep latest flowState for flushBatch so we can skip pushing selection-only changes (keeps redo stack)
	const flowStateRef = useRef<FlowState>(flowState);
	flowStateRef.current = flowState;

	const setNodes = useCallback(
		(updater: React.SetStateAction<Node[]>) => {
			setFlowState((prev) => ({
				...prev,
				nodes: typeof updater === 'function' ? updater(prev.nodes) : updater,
			}));
		},
		[setFlowState]
	);

	const setEdges = useCallback(
		(updater: React.SetStateAction<Edge[]>) => {
			setFlowState((prev) => ({
				...prev,
				edges: typeof updater === 'function' ? updater(prev.edges) : updater,
			}));
		},
		[setFlowState]
	);

	// Batch node + edge changes so one undo step reverts both (avoids "undo edges then nodes" and multiple Cmd+Z)
	const BATCH_MS = 50;
	const pendingNodeChangesRef = useRef<NodeChange[][]>([]);
	const pendingEdgeChangesRef = useRef<EdgeChange[][]>([]);
	const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Only push to history after user has done an explicit action. Used so initial load/drag doesn't show Undo.
	const historyAllowedRef = useRef(false);
	// Show Undo/Redo in context menu only after user has acted (avoids "Undo" appearing initially from any stray push).
	const [hasUserActed, setHasUserActed] = useState(false);

	// Apply pending node/edge changes and return new state (or null if nothing pending). Does not call setFlowState.
	const applyPendingAndGetState = useCallback((): FlowState | null => {
		const nodeChanges = pendingNodeChangesRef.current;
		const edgeChanges = pendingEdgeChangesRef.current;
		pendingNodeChangesRef.current = [];
		pendingEdgeChangesRef.current = [];
		if (nodeChanges.length === 0 && edgeChanges.length === 0) return null;
		const prev = flowStateRef.current;
		let nextNodes = prev.nodes;
		let nextEdges = prev.edges;
		for (const changes of nodeChanges) {
			nextNodes = applyNodeChanges(changes, nextNodes);
		}
		for (const changes of edgeChanges) {
			nextEdges = applyEdgeChanges(changes, nextEdges);
		}
		return { ...prev, nodes: nextNodes, edges: nextEdges };
	}, []);

	// Flush batched changes to state. Never pushes to history (action-based undo pushes only at action boundaries).
	const flushBatch = useCallback(() => {
		batchTimeoutRef.current = null;
		const newState = applyPendingAndGetState();
		if (newState !== null) {
			setFlowState(newState, undefined, true);
		}
	}, [applyPendingAndGetState, setFlowState]);

	// Push one undo step when a discrete user action ends (e.g. drag end). Call after applying any pending batch.
	const pushUndoStep = useCallback(
		(newState: FlowState) => {
			historyAllowedRef.current = true;
			setHasUserActed(true);
			setFlowState(newState, undefined, false);
		},
		[setFlowState]
	);

	// On drag end: apply any pending position changes, then record one undo step (deterministic: one move = one step).
	const onNodeDragStop = useCallback(() => {
		if (batchTimeoutRef.current !== null) {
			clearTimeout(batchTimeoutRef.current);
			batchTimeoutRef.current = null;
		}
		const newState = applyPendingAndGetState();
		if (newState !== null) {
			pushUndoStep(newState);
		}
	}, [applyPendingAndGetState, pushUndoStep]);

	const onNodesChange = useCallback(
		(changes: NodeChange[]) => {
			pendingNodeChangesRef.current.push(changes);
			if (batchTimeoutRef.current !== null) clearTimeout(batchTimeoutRef.current);
			batchTimeoutRef.current = setTimeout(flushBatch, BATCH_MS);
		},
		[flushBatch]
	);

	const onEdgesChange = useCallback(
		(changes: EdgeChange[]) => {
			pendingEdgeChangesRef.current.push(changes);
			if (batchTimeoutRef.current !== null) clearTimeout(batchTimeoutRef.current);
			batchTimeoutRef.current = setTimeout(flushBatch, BATCH_MS);
		},
		[flushBatch]
	);

	useEffect(() => () => {
		if (batchTimeoutRef.current !== null) clearTimeout(batchTimeoutRef.current);
	}, []);

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

	const { screenToFlowPosition, getNode, toObject } = useReactFlow();

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
				setFlowState(
					{
						...flowStateRef.current,
						nodes: [{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: {} }],
						edges: [],
					},
					undefined,
					true
				);
			}

			setWorkflowLoaded(true);
		});

		return unsubscribe;
	}, [editorContext, workflowLoaded, isLibraryMode]);

	// Auto-save workflow to localStorage when nodes or edges change
	useEffect(() => {
		console.log('[Editor] Auto-save check:', {
			isLibraryMode,
			spellId,
			workflowLoaded,
			sceneKey: editorContext?.sceneKey,
			nodeCount: nodes.length,
			edgeCount: edges.length
		})

		// Library mode: save spell data AND UI state
		if (isLibraryMode) {
			if (!spellId) {
				console.log('[Editor] Library mode: No spellId, skipping save')
				return // Only save if we have a spell ID
			}

		const timeoutId = setTimeout(() => {
			try {
				console.log('[Editor] Auto-saving spell data for:', spellId, 'name:', spellName)

				// Save spell data (flow already contains nodes with positions)
				// Only need to save viewport separately
				upsertSpell({
					id: spellId,
					name: spellName,
					flow: { nodes, edges }
					// Note: viewport would be saved separately if we track it
				})
				console.log('[Editor] Spell data auto-saved successfully')
			} catch (err) {
				console.error('[Editor] Failed to auto-save:', err)
			}
		}, 1000) // 1 second debounce

			return () => clearTimeout(timeoutId)
		}

		// Game mode: No auto-save needed (workflow resets on level entry)
		// Spells are saved in save system, not localStorage
		if (!workflowLoaded) {
			return
		}

		if (!editorContext?.sceneKey) {
			return
		}

		// No-op: workflow is intentionally temporary in game mode
		// Each level loads fresh from initialSpellWorkflow
		console.log('[Editor] Game mode: workflow changes are temporary (not auto-saved)')

		return () => {};
	}, [nodes, edges, editorContext, workflowLoaded, isLibraryMode, spellId, spellName]);
	useEffect(() => {
		if (!startingFlow) return
		bumpNodeIdCounterFromNodes(startingFlow.nodes)
	}, [startingFlow])

	// Force save function (no debounce)
	const forceSave = useCallback(() => {
		console.log('[Editor] Force save triggered')

		if (isLibraryMode) {
			if (!spellId) {
				console.log('[Editor] Force save: No spellId in library mode')
				return
			}
		try {
			console.log('[Editor] Force saving spell data for:', spellId, 'name:', spellName)

			// Save spell data (flow already contains nodes with positions)
			upsertSpell({
				id: spellId,
				name: spellName,
				flow: { nodes, edges }
			})
			console.log('[Editor] Spell data saved successfully')
		} catch (err) {
			console.error('[Editor] Force save failed:', err)
		}
		} else {
			// Game mode: No force save needed
			// Workflow is intentionally temporary and resets on level entry
			console.log('[Editor] Game mode: workflow is temporary (not saved)')
		}
	}, [isLibraryMode, spellId, spellName, nodes, edges, editorContext])

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
			setEdges((eds) => addEdge(params, eds));
		},
		[setEdges]
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

	// Delete selected nodes and edges in one step (one undo)
	const handleDeleteSelected = useCallback(() => {
		historyAllowedRef.current = true;
		setHasUserActed(true);
		setFlowState((prev) => {
			const nodesToDelete = new Set(
				prev.nodes.filter((node) => node.selected).map((node) => node.id)
			);
			const nextNodes = prev.nodes.filter((node) => !node.selected);
			const nextEdges = prev.edges.filter((edge) => {
				if (edge.selected) return false;
				if (nodesToDelete.has(edge.source) || nodesToDelete.has(edge.target)) return false;
				return true;
			});
			return { ...prev, nodes: nextNodes, edges: nextEdges };
		});
	}, [setFlowState]);

	const applyPaste = useCallback(
		(newNodes: Node[], newEdges: Edge[]) => {
			historyAllowedRef.current = true;
			setHasUserActed(true);
			setFlowState((prev) => ({
				...prev,
				nodes: [...prev.nodes, ...newNodes],
				edges: [...prev.edges, ...newEdges],
			}));
		},
		[setFlowState]
	);

	const { canPaste, handleCopy, handlePaste } = useEditorClipboard({
		nodes,
		edges,
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

		setMenuState(null);
	};

	// Add basic node from menu and connect
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => {
		if (!menuState) return;
		historyAllowedRef.current = true;
		setHasUserActed(true);

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

		setMenuState(null);
	};

	// Evaluate the workflow
	const handleEvaluate = () => {
		try {
			setError(null);

			console.log('[Evaluate] Starting evaluation...')
			console.log('[Evaluate] Nodes:', nodes)
		console.log('[Evaluate] Edges:', edges)

		// Convert Flow to Spell IR
		const spell = flowToIR(nodes, edges);
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
				const compiledAST = flowToIR(nodes, edges)
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
						setFlowState((prev) => ({ ...prev, nodes: importNodes, edges: importEdges }));
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

			{/* Main content area */}
			<div className="flex-1 relative">
				{/* React Flow editor - focusable so keyboard shortcuts work after clicking canvas */}
				<div
					className="w-full h-full outline-none"
					tabIndex={0}
					onContextMenu={(e) => {
						e.preventDefault();
						const selectedNodes = nodes.filter((n) => n.selected);
						const selectedCount = selectedNodes.length;
						if (selectedCount <= 1) {
							setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
							setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
						} else {
							// Multi-selection: keep it only if right-click is inside or near the selection window
							const flowClick = screenToFlowPosition({ x: e.clientX, y: e.clientY });
							const margin = 100; // flow units: "near" = within this distance of the selection box
							let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
							for (const node of selectedNodes) {
								const { x, y } = node.position;
								minX = Math.min(minX, x);
								minY = Math.min(minY, y);
								maxX = Math.max(maxX, x);
								maxY = Math.max(maxY, y);
							}
							// Expand box by typical node size so "inside" includes the nodes, then add margin for "near"
							const pad = 120;
							const insideOrNear =
								flowClick.x >= minX - margin - pad &&
								flowClick.x <= maxX + margin + pad &&
								flowClick.y >= minY - margin - pad &&
								flowClick.y <= maxY + margin + pad;
							if (!insideOrNear) {
								setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
								setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
							}
						}
						setContextMenu({
							show: true,
							position: { x: e.clientX, y: e.clientY }
						});
					}}
					onClick={(e) => {
						// Close menus when clicking anywhere in editor area
						setMenuState(null);
						setContextMenu(null);
						// Focus so keyboard shortcuts (copy/paste/undo) work after multi-select
						(e.currentTarget as HTMLElement).focus();
					}}
				>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onPaneClick={() => {
							// Clear selection only when clicking empty pane (not after drag-select)
							setNodes((nds) =>
								nds.map((n) => ({ ...n, selected: false }))
							);
							setEdges((eds) =>
								eds.map((e) => ({ ...e, selected: false }))
							);
							setMenuState(null);
							setContextMenu(null);
						}}
						onNodeContextMenu={(event, node) => {
							event.preventDefault();
							event.stopPropagation(); // Prevent event bubbling to parent div
							// Keep multi-selection when right-clicking a node that is already in the selection
							const othersSelected = nodes.some((n) => n.selected && n.id !== node.id);
							if (node.selected && othersSelected) {
								// Keep current selection so context menu Copy/Delete apply to all selected
							} else {
								setNodes((nds) =>
									nds.map((n) => ({
										...n,
										selected: n.id === node.id
									}))
								);
								setEdges((eds) =>
									eds.map((e) => ({ ...e, selected: false }))
								);
							}
							setContextMenu({
								show: true,
								position: { x: event.clientX, y: event.clientY },
								nodeId: node.id
							});
						}}
						onEdgeContextMenu={(event, edge) => {
							event.preventDefault();
							event.stopPropagation(); // Prevent event bubbling to parent div
							// Deselect all nodes
							setNodes((nds) =>
								nds.map((n) => ({
									...n,
									selected: false
								}))
							);
							// Select the right-clicked edge
							setEdges((eds) =>
								eds.map((e) => ({
									...e,
									selected: e.id === edge.id
								}))
							);
							// Open context menu
							setContextMenu({
								show: true,
								position: { x: event.clientX, y: event.clientY }
							});
						}}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onNodeDragStop={onNodeDragStop}
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
				onAddNode={contextMenu.nodeId ? () => {
					// If right-clicked on node, do nothing (shouldn't happen, but safe fallback)
				} : () => {
					setMenuState({ show: true, position: contextMenu.position });
					setContextMenu(null);
				}}
				onCopy={nodes.some((node) => node.selected) ? handleCopy : undefined}
				hasNodeSelected={nodes.some((node) => node.selected)}
				onPaste={handlePaste}
				canPaste={canPaste}
				onDeleteSelected={handleDeleteSelected}
				onUndo={undo}
				onRedo={redo}
				canUndo={hasUserActed && canUndo}
				canRedo={hasUserActed && canRedo}
				onEvaluate={() => {
					handleEvaluate();
					setContextMenu(null);
				}}
				onClose={() => setContextMenu(null)}
			/>
		)}
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
