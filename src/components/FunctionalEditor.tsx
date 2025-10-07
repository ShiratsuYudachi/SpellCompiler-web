// =============================================
// Functional Workflow Editor
// 函数式工作流编辑器
// =============================================

import { useCallback, useState } from 'react';
import ReactFlow, {
	Background,
	Controls,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
	type Connection,
	type Edge,
	type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Paper, Stack, Text, Alert } from '@mantine/core';

import { FlowLiteralNode } from './nodes/FlowLiteralNode';
import { FlowFunctionCallNode } from './nodes/FlowFunctionCallNode';
import { FlowIfNode } from './nodes/FlowIfNode';
import { FlowOutputNode } from './nodes/FlowOutputNode';

import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { ASTVisualizer } from './ASTVisualizer';
import type { ASTNode } from '../ast/ast';

// Define node types
const nodeTypes = {
	literal: FlowLiteralNode,
	functionCall: FlowFunctionCallNode,
	if: FlowIfNode,
	output: FlowOutputNode,
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
		type: 'functionCall',
		position: { x: 350, y: 180 },
		data: { functionName: 'std::add' }
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

export function FunctionalEditor() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	
	const [evaluationResult, setEvaluationResult] = useState<any>(null);
	const [currentAST, setCurrentAST] = useState<ASTNode | null>(null);
	const [error, setError] = useState<string | null>(null);

	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges]
	);

	// Add new node
	const addNode = (type: string) => {
		const newNode: Node = {
			id: `node-${nodeIdCounter++}`,
			type,
			position: { x: Math.random() * 300 + 50, y: Math.random() * 300 + 50 },
			data: getDefaultNodeData(type)
		};
		setNodes((nds) => [...nds, newNode]);
	};

	const getDefaultNodeData = (type: string) => {
		switch (type) {
			case 'literal':
				return { value: 0 };
			case 'functionCall':
				return { functionName: 'std::add' };
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
		<div className="h-screen flex flex-col">
			{/* Header */}
			<Paper shadow="sm" p="md" className="border-b">
				<Stack gap="sm">
					<Text size="xl" fw={700}>
						⚡ Functional Workflow Editor
					</Text>
					
					{/* Add node buttons */}
					<div className="flex gap-2 flex-wrap">
						<Button size="xs" color="green" onClick={() => addNode('literal')}>
							+ Literal
						</Button>
						<Button size="xs" color="yellow" onClick={() => addNode('functionCall')}>
							+ Function
						</Button>
						<Button size="xs" color="red" onClick={() => addNode('if')}>
							+ If
						</Button>
						<Button size="xs" color="purple" onClick={() => addNode('output')}>
							+ Output
						</Button>
						<div className="ml-auto">
							<Button size="xs" color="blue" onClick={handleEvaluate}>
								▶️ Evaluate
							</Button>
						</div>
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
		</div>
	);
}
