import { useCallback, useState } from 'react'
import ReactFlow, {
	Controls,
	Background,
	applyNodeChanges,
	applyEdgeChanges,
	addEdge,
	Node,
	Edge,
	Connection,
	OnNodesChange,
	OnEdgesChange,
	OnConnect,
	BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button, Paper, Stack, Text, Group, Code, ScrollArea } from '@mantine/core'

import { LiteralNode } from '../nodes/LiteralNode'
import { IdentifierNode } from '../nodes/IdentifierNode'
import { BinaryExpressionNode } from '../nodes/BinaryExpressionNode'
import { UnaryExpressionNode } from '../nodes/UnaryExpressionNode'
import { AssignmentNode } from '../nodes/AssignmentNode'
import { astToCode } from '../../utils/astToCode'

const nodeTypes = {
	literalNode: LiteralNode,
	identifierNode: IdentifierNode,
	binaryExprNode: BinaryExpressionNode,
	unaryExprNode: UnaryExpressionNode,
	assignmentNode: AssignmentNode,
}

let nodeIdCounter = 0

export function ASTNodeEditor() {
	const [nodes, setNodes] = useState<Node[]>([])
	const [edges, setEdges] = useState<Edge[]>([])
	const [previewCode, setPreviewCode] = useState('')

	const onNodesChange: OnNodesChange = useCallback(
		(changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
		[]
	)

	const onEdgesChange: OnEdgesChange = useCallback(
		(changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
		[]
	)

	const onConnect: OnConnect = useCallback(
		(connection) => setEdges((eds) => addEdge(connection, eds)),
		[]
	)

	// Add a new node
	const addNode = (type: string) => {
		const id = `node-${nodeIdCounter++}`
		let astNode: any
		let nodeType: string

		switch (type) {
			case 'literal':
				astNode = { type: 'Literal', value: 0, dataType: 'number' }
				nodeType = 'literalNode'
				break
			case 'identifier':
				astNode = { type: 'Identifier', name: 'x' }
				nodeType = 'identifierNode'
				break
			case 'binary':
				astNode = { type: 'BinaryExpression', operator: '+' }
				nodeType = 'binaryExprNode'
				break
			case 'unary':
				astNode = { type: 'UnaryExpression', operator: '-' }
				nodeType = 'unaryExprNode'
				break
			case 'assignment':
				astNode = { type: 'AssignmentStatement' }
				nodeType = 'assignmentNode'
				break
			default:
				return
		}

		const newNode: Node = {
			id,
			type: nodeType,
			position: { 
				x: Math.random() * 400 + 100, 
				y: Math.random() * 400 + 100 
			},
			data: { 
				astNode,
				onChange: (updates: any) => {
					setNodes((nds) =>
						nds.map((n) =>
							n.id === id
								? { ...n, data: { ...n.data, astNode: { ...n.data.astNode, ...updates } } }
								: n
						)
					)
				}
			},
		}

		setNodes((nds) => [...nds, newNode])
	}

	// Generate code preview
	const generatePreview = () => {
		// Find root nodes (nodes with no incoming edges)
		const targetNodeIds = new Set(edges.map(e => e.target))
		const rootNodes = nodes.filter(n => !targetNodeIds.has(n.id))

		if (rootNodes.length === 0) {
			setPreviewCode('// No nodes to preview')
			return
		}

		// For now, just show a simple representation
		let code = '// Generated AST Preview\n\n'
		rootNodes.forEach(node => {
			const ast = buildASTFromNode(node.id)
			if (ast) {
				code += astToCode(ast) + '\n\n'
			}
		})
		setPreviewCode(code)
	}

	// Build AST from a node (recursive)
	const buildASTFromNode = (nodeId: string): any => {
		const node = nodes.find(n => n.id === nodeId)
		if (!node) return null

		const astNode = { ...node.data.astNode }

		// Find connected inputs
		const incomingEdges = edges.filter(e => e.target === nodeId)

		switch (node.type) {
			case 'binaryExprNode':
				const leftEdge = incomingEdges.find(e => e.targetHandle === 'left')
				const rightEdge = incomingEdges.find(e => e.targetHandle === 'right')
				astNode.left = leftEdge ? buildASTFromNode(leftEdge.source) : { type: 'Literal', value: 0, dataType: 'number' }
				astNode.right = rightEdge ? buildASTFromNode(rightEdge.source) : { type: 'Literal', value: 0, dataType: 'number' }
				break

			case 'unaryExprNode':
				const operandEdge = incomingEdges.find(e => e.targetHandle === 'operand')
				astNode.operand = operandEdge ? buildASTFromNode(operandEdge.source) : { type: 'Literal', value: 0, dataType: 'number' }
				break

			case 'assignmentNode':
				const varEdge = incomingEdges.find(e => e.targetHandle === 'left')
				const valueEdge = incomingEdges.find(e => e.targetHandle === 'right')
				astNode.left = varEdge ? buildASTFromNode(varEdge.source) : { type: 'Identifier', name: 'x' }
				astNode.right = valueEdge ? buildASTFromNode(valueEdge.source) : { type: 'Literal', value: 0, dataType: 'number' }
				break
		}

		return astNode
	}

	return (
		<div className="h-screen flex">
			{/* Left Toolbar */}
			<Paper shadow="sm" className="w-64 p-4 border-r">
				<Stack gap="md">
					<Text fw={700} size="lg">Node Palette</Text>
					
					<div>
						<Text size="sm" fw={600} c="dimmed" mb="xs">Expressions</Text>
						<Stack gap="xs">
							<Button 
								variant="light" 
								color="orange" 
								size="xs"
								onClick={() => addNode('literal')}
								fullWidth
							>
								+ Literal
							</Button>
							<Button 
								variant="light" 
								color="violet" 
								size="xs"
								onClick={() => addNode('identifier')}
								fullWidth
							>
								+ Variable
							</Button>
							<Button 
								variant="light" 
								color="yellow" 
								size="xs"
								onClick={() => addNode('binary')}
								fullWidth
							>
								+ Binary Op
							</Button>
							<Button 
								variant="light" 
								color="cyan" 
								size="xs"
								onClick={() => addNode('unary')}
								fullWidth
							>
								+ Unary Op
							</Button>
						</Stack>
					</div>

					<div>
						<Text size="sm" fw={600} c="dimmed" mb="xs">Statements</Text>
						<Stack gap="xs">
							<Button 
								variant="light" 
								color="green" 
								size="xs"
								onClick={() => addNode('assignment')}
								fullWidth
							>
								+ Assignment
							</Button>
						</Stack>
					</div>

					<Button 
						variant="filled" 
						color="indigo"
						onClick={generatePreview}
						fullWidth
					>
						Generate Preview
					</Button>
				</Stack>
			</Paper>

			{/* Main Canvas */}
			<div className="flex-1 relative">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					nodeTypes={nodeTypes}
					fitView
				>
					<Background variant={BackgroundVariant.Dots} />
					<Controls />
				</ReactFlow>
			</div>

			{/* Right Preview Panel */}
			<Paper shadow="sm" className="w-96 p-4 border-l">
				<Stack gap="md" className="h-full">
					<Group justify="space-between">
						<Text fw={700} size="lg">Code Preview</Text>
					</Group>
					
					<ScrollArea className="flex-1">
						<Code block className="text-sm">
							{previewCode || '// Click "Generate Preview" to see code'}
						</Code>
					</ScrollArea>
				</Stack>
			</Paper>
		</div>
	)
}
