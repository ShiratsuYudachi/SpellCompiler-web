// =============================================
// Functional Workflow Editor
// 函数式工作流编辑器
// =============================================

import { useCallback, useState, useMemo } from 'react';
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
import { Button, Paper, Stack, Text, Alert } from '@mantine/core';

import { LiteralNode } from './nodes/LiteralNode';
import { DynamicFunctionNode } from './nodes/DynamicFunctionNode';
import { CustomFunctionNode } from './nodes/CustomFunctionNode';
import { IfNode } from './nodes/IfNode';
import { OutputNode } from './nodes/OutputNode';
import { FunctionDefNode } from './nodes/FunctionDefNode';
import { FunctionOutNode } from './nodes/FunctionOutNode';

import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { ASTVisualizer } from './ASTVisualizer';
import type { ASTNode } from '../ast/ast';
import type { FunctionInfo } from '../utils/getFunctionRegistry';
import { EditorProvider } from '../contexts/EditorContext';
import { NodeSelectionMenu } from './menus/NodeSelectionMenu';
import { ContextMenu } from './menus/ContextMenu';

// Define node types
const nodeTypes = {
	literal: LiteralNode,
	dynamicFunction: DynamicFunctionNode,
	customFunction: CustomFunctionNode,
	if: IfNode,
	output: OutputNode,
	functionDef: FunctionDefNode,
	functionOut: FunctionOutNode,
};

// Initial example nodes
const initialNodes: Node[] = [
	{
		id: 'output-1',
		type: 'output',
		position: { x: 600, y: 200 },
		data: { label: 'Output' }
	},
	{
		id: 'func-1',
		type: 'dynamicFunction',
		position: { x: 350, y: 180 },
		data: { 
			functionName: 'std::add',
			displayName: 'add',
			namespace: 'std',
			params: ['a', 'b']
		}
	},
	{
		id: 'lit-1',
		type: 'literal',
		position: { x: 100, y: 150 },
		data: { value: 10 }
	},
	{
		id: 'lit-2',
		type: 'literal',
		position: { x: 100, y: 230 },
		data: { value: 20 }
	},
];

const initialEdges: Edge[] = [
	{ id: 'e1', source: 'func-1', target: 'output-1', targetHandle: 'value' },
	{ id: 'e2', source: 'lit-1', target: 'func-1', targetHandle: 'arg0' },
	{ id: 'e3', source: 'lit-2', target: 'func-1', targetHandle: 'arg1' },
];

let nodeIdCounter = 100;

function EditorContent() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	
	const [evaluationResult, setEvaluationResult] = useState<any>(null);
	const [currentAST, setCurrentAST] = useState<ASTNode | null>(null);
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

	const { screenToFlowPosition, getNode } = useReactFlow();

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

	// Add function node from menu and connect
	const addFunctionNodeFromMenu = (funcInfo: FunctionInfo) => {
		if (!menuState) return;

		const newNodeId = `node-${nodeIdCounter++}`;

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
					isVariadic: funcInfo.paramCount === 0 && funcInfo.name.includes('list')
				}
			};

			setNodes((nds) => [...nds, newNode]);

			// Create edge from source handle to new node's first input
			const newEdge: Edge = {
				id: `e-${Date.now()}`,
				source: menuState.sourceNodeId,
				sourceHandle: menuState.sourceHandleId!,
				target: newNodeId,
				targetHandle: 'arg0'
			};
			setEdges((eds) => [...eds, newEdge]);
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
					isVariadic: funcInfo.paramCount === 0 && funcInfo.name.includes('list')
				}
			};

			setNodes((nds) => [...nds, newNode]);
		}

		setMenuState(null);
	};

	// Add basic node from menu and connect
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output' | 'functionDef' | 'functionOut' | 'customFunction') => {
		if (!menuState) return;

		const newNodeId = `node-${nodeIdCounter++}`;

		// Determine default data for the node
		const getDefaultData = () => {
			switch (type) {
				case 'literal':
					return { value: 0 };
				case 'functionDef':
					return { functionName: 'myFunc', paramCount: 1, params: ['arg0'] };
				case 'functionOut':
					return {};
				case 'customFunction':
					return { functionName: 'myFunc', paramCount: 1 };
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

			setNodes((nds) => [...nds, newNode]);

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

			setNodes((nds) => [...nds, newNode]);
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

			// Evaluate IR
			const evaluator = new Evaluator();

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
		}
	};

	return (
		<EditorProvider value={editorContextValue}>
			<div className="h-screen flex flex-col">
			{/* Header */}
			<Paper shadow="sm" p="md" className="border-b">
				<Stack gap="sm">
					<div className="flex items-center justify-between">
						<Text size="xl" fw={700}>
							⚡ Functional Workflow Editor
						</Text>
						<Button size="sm" color="indigo" onClick={handleEvaluate}>
							▶️ Evaluate
						</Button>
					</div>

					{/* Result display */}
					{error && (
						<Alert color="red" title="Error">
							{error}
						</Alert>
					)}

					{evaluationResult !== null && (
						<Alert color="green" title="Result">
							<Text size="lg" fw={700}>
								{JSON.stringify(evaluationResult)}
							</Text>
						</Alert>
					)}
				</Stack>
			</Paper>

			{/* Main content area */}
			<div className="flex-1 flex">
				{/* React Flow editor */}
				<div
					className="flex-1 relative"
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

			{/* AST Visualizer sidebar */}
			{currentAST && (
				<div className="w-96 border-l bg-white overflow-auto p-4">
					<Text size="lg" fw={700} mb="md">
						📊 AST Structure
					</Text>
					<ASTVisualizer ast={currentAST} />
				</div>
			)}
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
