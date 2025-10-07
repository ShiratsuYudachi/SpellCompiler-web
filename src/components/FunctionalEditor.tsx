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
import { IfNode } from './nodes/IfNode';
import { OutputNode } from './nodes/OutputNode';

import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { ASTVisualizer } from './ASTVisualizer';
import type { ASTNode } from '../ast/ast';
import { getFunctionsByNamespace, type FunctionInfo } from '../utils/getFunctionRegistry';
import { EditorProvider } from '../contexts/EditorContext';
import { NodeSelectionMenu } from './menus/NodeSelectionMenu';

// Define node types
const nodeTypes = {
	literal: LiteralNode,
	dynamicFunction: DynamicFunctionNode,
	if: IfNode,
	output: OutputNode,
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
	const [showFunctionMenu, setShowFunctionMenu] = useState(false);
	const [menuState, setMenuState] = useState<{
		show: boolean;
		position: { x: number; y: number };
		sourceNodeId: string;
		sourceHandleId: string;
	} | null>(null);

	const { screenToFlowPosition, getNode } = useReactFlow();

	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges]
	);
	
	// Get all available functions
	const functionsByNamespace = getFunctionsByNamespace();

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
		const flowPos = screenToFlowPosition({ x: menuState.position.x, y: menuState.position.y });
		
		const newNode: Node = {
			id: newNodeId,
			type: 'dynamicFunction',
			position: { x: flowPos.x + 50, y: flowPos.y },
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
			sourceHandle: menuState.sourceHandleId,
			target: newNodeId,
			targetHandle: 'arg0'
		};
		setEdges((eds) => [...eds, newEdge]);
		
		setMenuState(null);
	};

	// Add basic node from menu and connect
	const addBasicNodeFromMenu = (type: 'literal' | 'if' | 'output') => {
		if (!menuState) return;

		const newNodeId = `node-${nodeIdCounter++}`;
		const flowPos = screenToFlowPosition({ x: menuState.position.x, y: menuState.position.y });
		
		const newNode: Node = {
			id: newNodeId,
			type,
			position: { x: flowPos.x + 50, y: flowPos.y },
			data: type === 'literal' ? { value: 0 } : {}
		};
		
		setNodes((nds) => [...nds, newNode]);
		
		// Create edge
		const targetHandle = type === 'if' ? 'condition' : 'value';
		const newEdge: Edge = {
			id: `e-${Date.now()}`,
			source: menuState.sourceNodeId,
			sourceHandle: menuState.sourceHandleId,
			target: newNodeId,
			targetHandle
		};
		setEdges((eds) => [...eds, newEdge]);
		
		setMenuState(null);
	};
	
	// Add function node by function info (from header button)
	const addFunctionNode = (funcInfo: FunctionInfo) => {
		const newNode: Node = {
			id: `node-${nodeIdCounter++}`,
			type: 'dynamicFunction',
			position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
			data: {
				functionName: funcInfo.name,
				displayName: funcInfo.displayName,
				namespace: funcInfo.namespace,
				params: funcInfo.params,
				isVariadic: funcInfo.paramCount === 0 && funcInfo.name.includes('list')
			}
		};
		setNodes((nds) => [...nds, newNode]);
		setShowFunctionMenu(false);
	};
	
	// Add basic node
	const addBasicNode = (type: string) => {
		const newNode: Node = {
			id: `node-${nodeIdCounter++}`,
			type,
			position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
			data: getDefaultNodeData(type)
		};
		setNodes((nds) => [...nds, newNode]);
	};

	const getDefaultNodeData = (type: string) => {
		switch (type) {
			case 'literal':
				return { value: 0 };
			case 'if':
				return {};
			case 'output':
				return {};
			default:
				return {};
		}
	};

	// Evaluate the workflow
	const handleEvaluate = () => {
		try {
			setError(null);
			
			// Convert Flow to IR
			const ast = flowToIR(nodes, edges);
			setCurrentAST(ast);
			
			// Evaluate IR
			const evaluator = new Evaluator();
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
					<Text size="xl" fw={700}>
						⚡ Functional Workflow Editor
					</Text>
					
				{/* Add node buttons */}
				<div className="flex gap-2 flex-wrap">
					<Button size="xs" color="green" onClick={() => addBasicNode('literal')}>
						+ Literal
					</Button>
					<Button size="xs" color="blue" onClick={() => setShowFunctionMenu(!showFunctionMenu)}>
						+ Function {showFunctionMenu ? '▼' : '▶'}
					</Button>
					<Button size="xs" color="red" onClick={() => addBasicNode('if')}>
						+ If
					</Button>
					<Button size="xs" color="purple" onClick={() => addBasicNode('output')}>
						+ Output
					</Button>
					<div className="ml-auto">
						<Button size="xs" color="indigo" onClick={handleEvaluate}>
							▶️ Evaluate
						</Button>
					</div>
				</div>
				
				{/* Function selection menu */}
				{showFunctionMenu && (
					<Paper shadow="sm" p="sm" className="max-h-64 overflow-y-auto">
						{Object.entries(functionsByNamespace).map(([namespace, functions]) => (
							<div key={namespace} className="mb-3">
								<Text size="sm" fw={600} c="dimmed" mb="xs">
									{namespace}::
								</Text>
								<div className="grid grid-cols-3 gap-1">
									{functions.map((func) => (
										<Button
											key={func.name}
											size="xs"
											variant="light"
											onClick={() => addFunctionNode(func)}
											className="text-xs"
										>
											{func.displayName}
										</Button>
									))}
								</div>
							</div>
						))}
					</Paper>
				)}

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
				<div className="flex-1 relative">
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
