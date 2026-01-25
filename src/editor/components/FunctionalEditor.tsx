// =============================================
// Functional Workflow Editor
// 
// =============================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
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
import { GameEvents } from '../../game/events'
import { getGameInstance, getEditorContext, subscribeEditorContext } from '../../game/gameInstance'
import { getSceneConfig } from '../../game/scenes/sceneConfig'
import { upsertSpell, saveUIState } from '../utils/spellStorage'
import { registerGameFunctions } from '../library/game'
import { SpellInputNode } from './nodes/SpellInputNode'
import { AddEventPanel } from './AddEventPanel'
import { EventListPanel } from './EventListPanel'

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

function EditorContent(props: FunctionalEditorProps) {
	const isLibraryMode = props.isLibraryMode ?? Boolean(props.onExit && props.initialSpellId !== null)
	const startingFlow = props.initialFlow || (isLibraryMode ? defaultNewFlow : null)
	const [nodes, setNodes, onNodesChange] = useNodesState(startingFlow?.nodes || []);
	const [edges, setEdges, onEdgesChange] = useEdgesState(startingFlow?.edges || []);

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
	const [contextMenu, setContextMenu] = useState<{
		show: boolean;
		position: { x: number; y: number };
		nodeId?: string;
	} | null>(null);
	const [editorContext, setEditorContext] = useState<{ sceneKey?: string; refreshId?: number } | null>(() => getEditorContext());
	const [workflowLoaded, setWorkflowLoaded] = useState(false);
	const [compilationStatus, setCompilationStatus] = useState<'compiled' | 'failed' | null>(null);

	const { screenToFlowPosition, getNode, toObject } = useReactFlow();

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

			// Load workflow from localStorage or use default
			const storageKey = `spell-workflow-${newSceneKey || 'default'}`;
			console.log('[Editor] Game mode: loading workflow for sceneKey:', newSceneKey, 'storageKey:', storageKey)

			try {
				const saved = localStorage.getItem(storageKey);
				if (saved) {
					const flow = JSON.parse(saved);
					if (flow.nodes && Array.isArray(flow.nodes)) {
						console.log('[Editor] Game mode: loaded saved workflow, nodes:', flow.nodes.length)
						setNodes(flow.nodes);
						// Update nodeIdCounter to avoid conflicts
						let maxId = nodeIdCounter;
						flow.nodes.forEach((node: Node) => {
							const match = node.id.match(/-(\d+)$/);
							if (match) {
								const num = parseInt(match[1], 10);
								if (num >= maxId) maxId = num + 1;
							}
						});
						nodeIdCounter = maxId;
					}
					if (flow.edges && Array.isArray(flow.edges)) {
						setEdges(flow.edges);
					}
				} else {
					console.log('[Editor] Game mode: no saved workflow, loading defaults')
					// No saved workflow, load from scene config
					const config = newSceneKey ? getSceneConfig(newSceneKey) : null;
					const templateNodes = config?.initialSpellWorkflow?.nodes || [];
					const templateEdges = config?.initialSpellWorkflow?.edges || [];

					setNodes(templateNodes);
					setEdges(templateEdges);
				}
			} catch (err) {
				console.error('[Editor] Failed to load workflow:', err);
				// Fallback to empty workflow
				setNodes([{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: {} }]);
				setEdges([]);
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

					// Save both the spell data AND UI state
					upsertSpell({
						id: spellId,
						name: spellName,
						flow: { nodes, edges }
					})
					console.log('[Editor] Spell data auto-saved successfully')

					saveUIState(spellId, {
						nodes,
						edges,
						timestamp: Date.now()
					})
					console.log('[Editor] UI state auto-saved successfully')
				} catch (err) {
					console.error('[Editor] Failed to auto-save:', err)
				}
			}, 1000) // 1 second debounce

			return () => clearTimeout(timeoutId)
		}

		// Game mode: save to scene-specific storage
		if (!workflowLoaded) {
			console.log('[Editor] Game mode: Workflow not loaded yet, skipping save')
			return
		}

		if (!editorContext?.sceneKey) {
			console.log('[Editor] Game mode: No sceneKey, skipping save')
			return
		}

		// Debounce save to avoid excessive writes
		const timeoutId = setTimeout(() => {
			const sceneKey = editorContext.sceneKey;
			const storageKey = `spell-workflow-${sceneKey || 'default'}`;

			try {
				const flow = {
					nodes,
					edges,
					timestamp: Date.now()
				};
				console.log('[Editor] Saving workflow for scene:', sceneKey, 'to key:', storageKey)
				localStorage.setItem(storageKey, JSON.stringify(flow));
				console.log('[Editor] Workflow saved successfully')
			} catch (err) {
				console.error('[Editor] Failed to auto-save workflow:', err);
			}
		}, 1000); // 1 second debounce

		return () => clearTimeout(timeoutId);
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

				// Save both the spell data AND UI state
				upsertSpell({
					id: spellId,
					name: spellName,
					flow: { nodes, edges }
				})
				console.log('[Editor] Spell data saved successfully')

				saveUIState(spellId, {
					nodes,
					edges,
					timestamp: Date.now()
				})
				console.log('[Editor] UI state saved successfully')
			} catch (err) {
				console.error('[Editor] Force save failed:', err)
			}
		} else {
			// Game mode
			if (!editorContext?.sceneKey) {
				console.log('[Editor] Force save: No sceneKey in game mode')
				return
			}
			const sceneKey = editorContext.sceneKey
			const storageKey = `spell-workflow-${sceneKey || 'default'}`
			try {
				const flow = {
					nodes,
					edges,
					timestamp: Date.now()
				}
				console.log('[Editor] Force saving workflow for scene:', sceneKey, 'to key:', storageKey)
				localStorage.setItem(storageKey, JSON.stringify(flow))
				console.log('[Editor] Force save workflow successful')
			} catch (err) {
				console.error('[Editor] Force save workflow failed:', err)
			}
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
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
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

	// Delete selected nodes and edges
	const handleDeleteSelected = useCallback(() => {
		// Get IDs of nodes to be deleted
		const nodesToDelete = new Set(
			nodes.filter((node) => node.selected).map((node) => node.id)
		);

		// Remove selected nodes
		setNodes((nds) => nds.filter((node) => !node.selected));

		// Remove selected edges AND edges connected to deleted nodes
		setEdges((eds) =>
			eds.filter((edge) => {
				// Remove if edge itself is selected
				if (edge.selected) return false;
				// Remove if edge is connected to a deleted node
				if (nodesToDelete.has(edge.source) || nodesToDelete.has(edge.target)) return false;
				return true;
			})
		);
	}, [nodes, setNodes, setEdges]);

	// Keyboard shortcut for delete
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Delete or Backspace key
			if (event.key === 'Delete' || event.key === 'Backspace') {
				// Check if user is not typing in an input field
				const target = event.target as HTMLElement;
				if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
					event.preventDefault();
					handleDeleteSelected();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleDeleteSelected]);

	// Add function node from menu and connect
	const addFunctionNodeFromMenu = (funcInfo: FunctionInfo) => {
		if (!menuState) return;

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
		
		// Check if node type is allowed
		const sceneConfig = editorContext?.sceneKey ? getSceneConfig(editorContext.sceneKey) : undefined
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

			// Save spell data
			const nextId = upsertSpell({ id: spellId, name, flow })
			console.log('[Editor] Saved to library:', nextId, 'name:', name)

			// Save UI state (preserves node positions, zoom, etc.)
			saveUIState(nextId, {
				nodes,
				edges,
				timestamp: Date.now()
			})
			console.log('[Editor] UI state saved for:', nextId)

			setSpellId(nextId)
			setSpellName(name)
			
			// Try to compile
			try {
				flowToIR(nodes, edges)
				setCompilationStatus('compiled')
				setEvaluationResult({ saved: true, id: nextId, compiled: true })
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
						
						// Restore nodes and edges from the imported flow
						if (flow.nodes && Array.isArray(flow.nodes)) {
							setNodes(flow.nodes);
							
							// Update nodeIdCounter to avoid ID conflicts
							// Find the maximum node ID number from imported nodes
							let maxId = nodeIdCounter;
							flow.nodes.forEach((node: Node) => {
								// Extract number from IDs like "node-123", "lit-45", etc.
								const match = node.id.match(/-(\d+)$/);
								if (match) {
									const num = parseInt(match[1], 10);
									if (num >= maxId) {
										maxId = num + 1;
									}
								}
							});
							nodeIdCounter = maxId;
						}
						if (flow.edges && Array.isArray(flow.edges)) {
							setEdges(flow.edges);
						}
						
						// Clear evaluation results
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
				{/* React Flow editor */}
				<div
					className="w-full h-full"
					onContextMenu={(e) => {
						e.preventDefault();
						setContextMenu({
							show: true,
							position: { x: e.clientX, y: e.clientY }
						});
					}}
					onClick={() => {
						// Close all menus when clicking on canvas
						setMenuState(null);
						setContextMenu(null);
					}}
				>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodeContextMenu={(event, node) => {
							event.preventDefault();
							// Select the right-clicked node
							setNodes((nds) =>
								nds.map((n) => ({
									...n,
									selected: n.id === node.id
								}))
							);
							// Deselect all edges
							setEdges((eds) =>
								eds.map((e) => ({
									...e,
									selected: false
								}))
							);
							// Open context menu
							setContextMenu({
								show: true,
								position: { x: event.clientX, y: event.clientY },
								nodeId: node.id
							});
						}}
						onEdgeContextMenu={(event, edge) => {
							event.preventDefault();
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
						onConnect={onConnect}
						nodeTypes={nodeTypes}
						fitView
					// Touchpad support
					panOnScroll={true}
					zoomOnScroll={true}
					zoomOnPinch={true}
					panOnDrag={[1, 2]}
					selectionOnDrag={false}
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
				onAddNode={() => {
					// Open NodeSelectionMenu at context menu position
					setMenuState({
						show: true,
						position: contextMenu.position
					});
					setContextMenu(null);
				}}
				onDeleteSelected={handleDeleteSelected}
				hasSelection={nodes.some((node) => node.selected) || edges.some((edge) => edge.selected)}
				onEvaluate={() => {
					handleEvaluate();
					setContextMenu(null);
				}}
				onClose={() => setContextMenu(null)}
			/>
		)}
	</div>
	
		{/* Add Event Modal */}
	<Modal
		opened={addEventModalOpen}
		onClose={() => setAddEventModalOpen(false)}
		title="Add Event Binding"
		size="lg"
	>
		<AddEventPanel onClose={() => setAddEventModalOpen(false)} />
	</Modal>

	{/* Event List Modal */}
	<Modal
		opened={eventListModalOpen}
		onClose={() => setEventListModalOpen(false)}
		title="Active Bindings"
		size="lg"
	>
		<EventListPanel onAdd={() => setAddEventModalOpen(true)} />
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
