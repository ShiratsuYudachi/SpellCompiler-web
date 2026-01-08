// =============================================
// Functional Workflow Editor
// 
// =============================================

import { useCallback, useState, useMemo, useEffect } from 'react';
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
import { Button, Paper, Text, Alert } from '@mantine/core';

import { LiteralNode } from './nodes/LiteralNode';
import { DynamicFunctionNode } from './nodes/DynamicFunctionNode';
import { CustomFunctionNode } from './nodes/CustomFunctionNode';
import { ApplyFuncNode } from './nodes/ApplyFuncNode';
import { IfNode } from './nodes/IfNode';
import { OutputNode } from './nodes/OutputNode';
import { LambdaDefNode } from './nodes/LambdaDefNode';
import { FunctionOutNode } from './nodes/FunctionOutNode';

import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { ASTVisualizer } from './ASTVisualizer';
import type { ASTNode } from '../ast/ast';
import type { FunctionInfo } from '../utils/getFunctionRegistry';
import { EditorProvider } from '../contexts/EditorContext';
import { NodeSelectionMenu } from './menus/NodeSelectionMenu';
import { ContextMenu } from './menus/ContextMenu';
import { GameEvents } from '../../game/events'
import { getGameInstance } from '../../game/gameInstance'
import { getSceneConfig } from '../../game/scenes/sceneConfig'

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
};

let nodeIdCounter = 100;

function EditorContent() {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
	const [contextMenu, setContextMenu] = useState<{
		show: boolean;
		position: { x: number; y: number };
	} | null>(null);
	const [editorContext, setEditorContext] = useState<{ sceneKey?: string } | null>(null);
	const [workflowLoaded, setWorkflowLoaded] = useState(false);

	const { screenToFlowPosition, getNode, toObject } = useReactFlow();

	// Listen for editor context changes and load workflow
	useEffect(() => {
		const game = getGameInstance();
		if (!game) return;

		const handler = (context: { sceneKey?: string }) => {
			// Defer state update to avoid React warning
			setTimeout(() => {
				setEditorContext(context);

				// Load workflow from localStorage or use default
				const sceneKey = context.sceneKey;
				const storageKey = `spell-workflow-${sceneKey || 'default'}`;

				try {
					const saved = localStorage.getItem(storageKey);
					if (saved) {
						const flow = JSON.parse(saved);
						if (flow.nodes && Array.isArray(flow.nodes)) {
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
						console.log(`[Editor] Loaded workflow for ${sceneKey} from localStorage`);
					} else {
						// No saved workflow, load from scene config
						const config = sceneKey ? getSceneConfig(sceneKey) : null;
						const templateNodes = config?.initialSpellWorkflow?.nodes || [];
						const templateEdges = config?.initialSpellWorkflow?.edges || [];

						setNodes(templateNodes);
						setEdges(templateEdges);
						console.log(`[Editor] Using scene config template for ${sceneKey}`);
					}
				} catch (err) {
					console.error('[Editor] Failed to load workflow:', err);
					// Fallback to empty workflow
					setNodes([{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: {} }]);
					setEdges([]);
				}

				setWorkflowLoaded(true);
			}, 0);
		};

		game.events.on(GameEvents.setEditorContext, handler);
		return () => {
			game.events.off(GameEvents.setEditorContext, handler);
		};
	}, []);

	// Filter nodes based on scene context (memoized for performance)
	const filteredNodes = useMemo(() => {
		const isLevel1 = editorContext?.sceneKey === 'Level1';
		if (!isLevel1) return nodes;

		return nodes.filter((node) => {
			if (node.type === 'dynamicFunction') {
				const funcName = (node.data as any)?.functionName;
				return funcName === 'game::getPlayer' || funcName === 'game::teleportRelative';
			}
			return node.type === 'literal' || node.type === 'output';
		});
	}, [nodes, editorContext]);

	// Remove disallowed nodes from state when context changes or nodes are added
	useEffect(() => {
		const isLevel1 = editorContext?.sceneKey === 'Level1';
		if (!isLevel1) return;

		const disallowedNodes = nodes.filter((node) => {
			if (node.type === 'dynamicFunction') {
				const funcName = (node.data as any)?.functionName;
				return funcName !== 'game::getPlayer' && funcName !== 'game::teleportRelative';
			}
			return node.type !== 'literal' && node.type !== 'output';
		});

		if (disallowedNodes.length > 0) {
			// Remove disallowed nodes from state
			setNodes((nds) => nds.filter((node) => !disallowedNodes.includes(node)));
			// Show error message
			setTimeout(() => {
				setError(`Some nodes were removed. Only literal, output, getPlayer, and teleportRelative nodes are allowed in Level1.`);
			}, 0);
		}
	}, [nodes, editorContext]);

	// Auto-save workflow to localStorage when nodes or edges change
	useEffect(() => {
		if (!workflowLoaded || !editorContext?.sceneKey) return;

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
				localStorage.setItem(storageKey, JSON.stringify(flow));
				console.log(`[Editor] Auto-saved workflow for ${sceneKey}`);
			} catch (err) {
				console.error('[Editor] Failed to auto-save workflow:', err);
			}
		}, 1000); // 1 second debounce

		return () => clearTimeout(timeoutId);
	}, [nodes, edges, editorContext, workflowLoaded]);

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

	// Check if node type is allowed in current scene context
	const isNodeTypeAllowed = (nodeType: string, funcName?: string): boolean => {
		const isLevel1 = editorContext?.sceneKey === 'Level1';
		if (!isLevel1) return true; // All nodes allowed in other scenes

		// In Level1, only allow specific node types
		if (nodeType === 'literal' || nodeType === 'output') {
			return true;
		}
		if (nodeType === 'dynamicFunction' && funcName) {
			return funcName === 'game::getPlayer' || funcName === 'game::teleportRelative';
		}
		return false;
	};

	// Add function node from menu and connect
	const addFunctionNodeFromMenu = (funcInfo: FunctionInfo) => {
		if (!menuState) return;

		// Check if this function is allowed in current scene
		if (!isNodeTypeAllowed('dynamicFunction', funcInfo.name)) {
			// Defer error to avoid React warning
			setTimeout(() => {
				setError(`Function ${funcInfo.displayName} is not available in this scene. Only getPlayer and teleportRelative are allowed.`);
			}, 0);
			setMenuState(null);
			return;
		}

		const newNodeId = `node-${nodeIdCounter++}`;
		const isVariadic = funcInfo.paramCount === 0 && funcInfo.name.includes('list')

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
					isVariadic
				}
			};

			// Use setNodes with validation to ensure node is actually added
			setNodes((nds) => {
				// Double-check before adding
				if (!isNodeTypeAllowed('dynamicFunction', funcInfo.name)) {
					return nds; // Don't add if not allowed
				}
				return [...nds, newNode];
			});

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
					isVariadic
				}
			};

			// Use setNodes with validation to ensure node is actually added
			setNodes((nds) => {
				// Double-check before adding
				if (!isNodeTypeAllowed('dynamicFunction', funcInfo.name)) {
					return nds; // Don't add if not allowed
				}
				return [...nds, newNode];
			});
		}

		setMenuState(null);
	};

	// Add basic node from menu and connect
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc') => {
		if (!menuState) return;

		// Check if this node type is allowed in current scene
		if (!isNodeTypeAllowed(type)) {
			// Defer error to avoid React warning
			setTimeout(() => {
				setError(`Node type ${type} is not available in this scene. Only literal and output nodes are allowed.`);
			}, 0);
			setMenuState(null);
			return;
		}

		const newNodeId = `node-${nodeIdCounter++}`;

		// Determine default data for the node
		const getDefaultData = () => {
			switch (type) {
				case 'literal':
					return { value: 0 };
				case 'lambdaDef':
					return { functionName: 'lambda', paramCount: 1, params: ['arg0'] };
				case 'customFunction':
					return { functionName: 'myFunc', paramCount: 1 };
				case 'applyFunc':
					return { paramCount: 1 };
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
				setNodes((nds) => {
					// Double-check before adding
					if (!isNodeTypeAllowed(type)) {
						return nds; // Don't add if not allowed
					}
					return [...nds, newNode, returnNode];
				});
			} else {
				setNodes((nds) => {
					// Double-check before adding
					if (!isNodeTypeAllowed(type)) {
						return nds; // Don't add if not allowed
					}
					return [...nds, newNode];
				});
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
				setNodes((nds) => {
					// Double-check before adding
					if (!isNodeTypeAllowed(type)) {
						return nds; // Don't add if not allowed
					}
					return [...nds, newNode, returnNode];
				});
			} else {
				setNodes((nds) => {
					// Double-check before adding
					if (!isNodeTypeAllowed(type)) {
						return nds; // Don't add if not allowed
					}
					return [...nds, newNode];
				});
			}
		}

		setMenuState(null);
	};

	// Evaluate the workflow
	const handleEvaluate = () => {
		try {
			setError(null);

			// Convert Flow to IR
			const { ast, functions } = flowToIR(nodes, edges);
			setCurrentAST(ast);
			setCurrentFunctions(functions);

			// Evaluate IR
			const evaluator = new Evaluator();

			// Register game functions for preview
			evaluator.registerNativeFunctionFullName('game::getPlayer', [], () => {
				return 'player'
			})
			evaluator.registerNativeFunctionFullName('game::teleportRelative', ['entityId', 'dx', 'dy'], (_entityId, dx, dy) => {
				return [dx, dy]
			})
			evaluator.registerNativeFunctionFullName('game::deflectAfterTime', ['angle', 'delayMs'], () => {
				return true // Mock value for preview
			})
			evaluator.registerNativeFunctionFullName('game::getProjectileAge', [], () => {
				return 0 // Mock value for preview
			})
			evaluator.registerNativeFunctionFullName('game::getProjectileDistance', [], () => {
				return 0 // Mock value for preview
			})

			// Register user-defined functions
			functions.forEach(fn => {
				evaluator.registerFunction(fn);
			});

			const result = evaluator.evaluate(ast, new Map());

			setEvaluationResult(result);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setEvaluationResult(null);
			setCurrentAST(null);
			setCurrentFunctions([]);
		}
	};

	const handleRegisterSpell = () => {
		try {
			setError(null)
			const { ast, functions } = flowToIR(nodes, edges)
			setCurrentAST(ast)
			setCurrentFunctions(functions)

			const game = getGameInstance()
			if (!game) {
				throw new Error('Game is not running')
			}

			game.events.emit(GameEvents.registerSpell, { ast, dependencies: functions })
			setEvaluationResult({ cast: true })
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err))
			setEvaluationResult(null)
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
							const isLevel1 = editorContext?.sceneKey === 'Level1';
							
							// Filter nodes if in Level1
							let nodesToImport = flow.nodes;
							if (isLevel1) {
								nodesToImport = flow.nodes.filter((node: Node) => {
									if (node.type === 'dynamicFunction') {
										const funcName = (node.data as any)?.functionName;
										return funcName === 'game::getPlayer' || funcName === 'game::teleportRelative';
									}
									return node.type === 'literal' || node.type === 'output';
								});
								
								if (nodesToImport.length < flow.nodes.length) {
									// Defer error to avoid React warning
									setTimeout(() => {
										setError(`Some nodes were removed during import. Only literal, output, getPlayer, and teleportRelative nodes are allowed in Level1.`);
									}, 0);
								}
							}
							
							setNodes(nodesToImport);
							
							// Update nodeIdCounter to avoid ID conflicts
							// Find the maximum node ID number from imported nodes
							let maxId = nodeIdCounter;
							nodesToImport.forEach((node: Node) => {
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
				<Text size="xl" fw={700}>
					⚡ Functional Workflow Editor
				</Text>
				<div className="flex gap-2">
					<Button size="sm" variant="outline" color="gray" onClick={handleImport}>
						📥 Import
					</Button>
					<Button size="sm" variant="outline" color="gray" onClick={handleExport}>
						📤 Export
					</Button>
					<Button size="sm" color="indigo" onClick={handleEvaluate}>
						▶️ Evaluate
					</Button>
					<Button size="sm" color="teal" onClick={handleRegisterSpell}>
						✨ Compile & Register
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
						nodes={filteredNodes}
						edges={edges}
						onNodesChange={(changes) => {
							// Filter out disallowed node additions in Level1
							const isLevel1 = editorContext?.sceneKey === 'Level1';
							if (isLevel1) {
								const filteredChanges: typeof changes = [];
								for (const change of changes) {
									// Block adding disallowed node types
									if (change.type === 'add' && change.item) {
										const node = change.item as Node;
										let isAllowed = false;
										
										if (node.type === 'dynamicFunction') {
											const funcName = (node.data as any)?.functionName;
											isAllowed = funcName === 'game::getPlayer' || funcName === 'game::teleportRelative';
											if (!isAllowed) {
												// Defer error to avoid React warning
												setTimeout(() => {
													setError(`Function ${funcName || 'unknown'} is not allowed in Level1. Only getPlayer and teleportRelative are available.`);
												}, 0);
											}
										} else if (node.type === 'literal' || node.type === 'output') {
											isAllowed = true;
										} else {
											// Defer error to avoid React warning
											setTimeout(() => {
												setError(`Node type ${node.type} is not allowed in Level1. Only literal and output nodes are available.`);
											}, 0);
										}
										
										if (isAllowed) {
											filteredChanges.push(change);
										}
									} else {
										// Allow all other changes (remove, select, position, etc.)
										filteredChanges.push(change);
									}
								}
								onNodesChange(filteredChanges);
							} else {
								onNodesChange(changes);
							}
						}}
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
				onEvaluate={() => {
					handleEvaluate();
					setContextMenu(null);
				}}
				onClose={() => setContextMenu(null)}
			/>
		)}
	</div>
		</EditorProvider>
	);
}

export function FunctionalEditor() {
	return (
		<ReactFlowProvider>
			<EditorContent />
		</ReactFlowProvider>
	);
}
