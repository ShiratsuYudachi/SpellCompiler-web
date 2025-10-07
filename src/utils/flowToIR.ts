// =============================================
// React Flow to IR Converter
// 将 React Flow 图转换为 IR (AST)
// =============================================

import type { Node, Edge } from '@xyflow/react';
import type { ASTNode, Literal, Identifier, FunctionCall, IfExpression } from '../ast/ast';
import type { 
	FlowNode,
	LiteralNodeData,
	IdentifierNodeData,
	FunctionCallNodeData,
	IfNodeData
} from '../types/flowTypes';

/**
 * Convert React Flow graph to IR
 * @param nodes - All nodes in the graph
 * @param edges - All edges connecting nodes
 * @returns The root ASTNode (starting from 'output' node)
 */
export function flowToIR(nodes: Node[], edges: Edge[]): ASTNode {
	// Find the output node (entry point)
	const outputNode = nodes.find(n => n.type === 'output');
	if (!outputNode) {
		throw new Error('No output node found in the graph');
	}

	// Build adjacency map: nodeId -> list of incoming edges
	const incomingEdges = new Map<string, Edge[]>();
	edges.forEach(edge => {
		const list = incomingEdges.get(edge.target) || [];
		list.push(edge);
		incomingEdges.set(edge.target, list);
	});

	// Convert from output node
	const inputEdges = incomingEdges.get(outputNode.id) || [];
	if (inputEdges.length === 0) {
		throw new Error('Output node has no input');
	}

	// Get the node connected to output
	const rootEdge = inputEdges[0];
	const rootNodeId = rootEdge.source;
	const rootNode = nodes.find(n => n.id === rootNodeId);
	
	if (!rootNode) {
		throw new Error(`Root node ${rootNodeId} not found`);
	}

	// Convert recursively
	return convertNode(rootNode as FlowNode, nodes, incomingEdges);
}

/**
 * Convert a single node to ASTNode
 */
function convertNode(
	node: FlowNode,
	allNodes: Node[],
	incomingEdges: Map<string, Edge[]>
): ASTNode {
	switch (node.type) {
		case 'literal': {
			const data = node.data as LiteralNodeData;
			return {
				type: 'Literal',
				value: data.value
			} as Literal;
		}

		case 'identifier': {
			const data = node.data as IdentifierNodeData;
			return {
				type: 'Identifier',
				name: data.name
			} as Identifier;
		}

		case 'functionCall': {
			const data = node.data as FunctionCallNodeData;
			const edges = incomingEdges.get(node.id) || [];
			
			// Sort edges by target handle (arg0, arg1, arg2, ...)
			const sortedEdges = edges
				.filter(e => e.targetHandle?.startsWith('arg'))
				.sort((a, b) => {
					const aIndex = parseInt(a.targetHandle?.replace('arg', '') || '0');
					const bIndex = parseInt(b.targetHandle?.replace('arg', '') || '0');
					return aIndex - bIndex;
				});

			// Convert each argument
			const args: ASTNode[] = sortedEdges.map(edge => {
				const sourceNode = allNodes.find(n => n.id === edge.source);
				if (!sourceNode) {
					throw new Error(`Source node ${edge.source} not found`);
				}
				return convertNode(sourceNode as FlowNode, allNodes, incomingEdges);
			});

			return {
				type: 'FunctionCall',
				function: data.functionName,
				args
			} as FunctionCall;
		}

		case 'if': {
			const edges = incomingEdges.get(node.id) || [];
			
			// Find condition, then, else branches
			const conditionEdge = edges.find(e => e.targetHandle === 'condition');
			const thenEdge = edges.find(e => e.targetHandle === 'then');
			const elseEdge = edges.find(e => e.targetHandle === 'else');

			if (!conditionEdge || !thenEdge || !elseEdge) {
				throw new Error(`If node ${node.id} missing required inputs`);
			}

			const conditionNode = allNodes.find(n => n.id === conditionEdge.source);
			const thenNode = allNodes.find(n => n.id === thenEdge.source);
			const elseNode = allNodes.find(n => n.id === elseEdge.source);

			if (!conditionNode || !thenNode || !elseNode) {
				throw new Error(`If node ${node.id} has invalid connections`);
			}

			return {
				type: 'IfExpression',
				condition: convertNode(conditionNode as FlowNode, allNodes, incomingEdges),
				thenBranch: convertNode(thenNode as FlowNode, allNodes, incomingEdges),
				elseBranch: convertNode(elseNode as FlowNode, allNodes, incomingEdges)
			} as IfExpression;
		}

		default:
			throw new Error(`Unknown node type: ${(node as any).type}`);
	}
}
