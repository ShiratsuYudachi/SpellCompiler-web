// =============================================
// React Flow to IR Converter
//  React Flow  IR (AST)
// =============================================

import type { Node, Edge } from 'reactflow';
import type { ASTNode, Literal, Identifier, FunctionCall, IfExpression, FunctionDefinition } from '../ast/ast';
import type {
	FlowNode,
	LiteralNodeData,
	IdentifierNodeData,
	DynamicFunctionNodeData,
	CustomFunctionNodeData,
	LambdaDefNodeData,
	FunctionOutNodeData
} from '../types/flowTypes';

/**
 * Convert React Flow graph to IR
 * @param nodes - All nodes in the graph
 * @param edges - All edges connecting nodes
 * @returns Object containing main expression and function definitions
 */
export function flowToIR(nodes: Node[], edges: Edge[]): { ast: ASTNode; functions: FunctionDefinition[] } {
	// Build adjacency map: nodeId -> list of incoming edges
	const incomingEdges = new Map<string, Edge[]>();
	edges.forEach(edge => {
		const list = incomingEdges.get(edge.target) || [];
		list.push(edge);
		incomingEdges.set(edge.target, list);
	});

	// Collect all function definitions by finding FunctionOut nodes connected to the graph
	const functionDefs: FunctionDefinition[] = [];
	const functionOutNodes = nodes.filter(n => n.type === 'functionOut');

	// Helper: Find which LambdaDef a node belongs to by traversing backwards
	const findOwningLambdaDef = (nodeId: string, visited = new Set<string>()): Node<LambdaDefNodeData> | null => {
		if (visited.has(nodeId)) return null;
		visited.add(nodeId);

		const node = nodes.find(n => n.id === nodeId);
		if (!node) return null;

		if (node.type === 'lambdaDef') {
			return node as Node<LambdaDefNodeData>;
		}

		// Check all edges coming into this node
		const incoming = incomingEdges.get(nodeId) || [];
		for (const edge of incoming) {
			const lambdaDef = findOwningLambdaDef(edge.source, visited);
			if (lambdaDef) return lambdaDef;
		}

		return null;
	};

	for (const funcOutNode of functionOutNodes) {
		// Get the value connected to the FunctionOut node
		const valueEdge = incomingEdges.get(funcOutNode.id)?.find(e => e.targetHandle === 'value');
		if (!valueEdge) {
			throw new Error(`Return node has no value connected`);
		}

		const outData = funcOutNode.data as FunctionOutNodeData;
		
		// Find the LambdaDef either by lambdaId or by traversing backwards
		let lambdaDefNode: Node<LambdaDefNodeData> | null = null;
		
		if (outData.lambdaId) {
			// Look up lambda by explicit ID
			lambdaDefNode = nodes.find(n => n.id === outData.lambdaId && n.type === 'lambdaDef') as Node<LambdaDefNodeData> | undefined || null;
		}
		
		if (!lambdaDefNode) {
			// Fallback: traverse backwards to find owning lambda
			lambdaDefNode = findOwningLambdaDef(valueEdge.source);
		}
		
		if (!lambdaDefNode) {
			throw new Error(`Return node is not connected to any lambda definition`);
		}

		const defData = lambdaDefNode.data as LambdaDefNodeData;
		const functionName = defData.functionName || 'unnamed';
		const params = defData.params || [];

		const valueNode = nodes.find(n => n.id === valueEdge.source);
		if (!valueNode) {
			throw new Error(`Function ${functionName} return value node not found`);
		}

		const bodyAST = convertNode(valueNode as FlowNode, nodes, incomingEdges, valueEdge.sourceHandle || undefined);

		functionDefs.push({
			name: functionName,
			params,
			body: bodyAST
		});
	}

	// Find the output node (entry point for main expression)
	const outputNode = nodes.find(n => n.type === 'output');
	if (!outputNode) {
		throw new Error('No output node found in the graph');
	}

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
	const ast = convertNode(rootNode as FlowNode, nodes, incomingEdges);

	return { ast, functions: functionDefs };
}

/**
 * Convert a single node to ASTNode
 * @param node - The node to convert
 * @param allNodes - All nodes in the graph
 * @param incomingEdges - Map of incoming edges
 * @param sourceHandle - Optional source handle ID (for parameter references)
 */
function convertNode(
	node: FlowNode,
	allNodes: Node[],
	incomingEdges: Map<string, Edge[]>,
	sourceHandle?: string
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

		case 'lambdaDef': {
			// If accessed via a parameter handle, return an Identifier for that parameter
			if (sourceHandle && sourceHandle.startsWith('param')) {
				const data = node.data as LambdaDefNodeData;
				const paramIndex = parseInt(sourceHandle.replace('param', ''));
				const paramName = data.params?.[paramIndex] || `arg${paramIndex}`;
				return {
					type: 'Identifier',
					name: paramName
				} as Identifier;
			}
			// Otherwise, it's an error
			throw new Error('LambdaDef node should not appear in expression tree');
		}

	case 'functionOut': {
		// FunctionOut has two outputs:
		// 1. 'value' handle - for return value (handled separately in function extraction)
		// 2. 'function' handle - outputs the function itself as a value
		if (sourceHandle === 'function') {
			const data = node.data as FunctionOutNodeData;
			// Find the lambda def node
			const lambdaDefNode = allNodes.find(n => n.id === data.lambdaId && n.type === 'lambdaDef');
			if (!lambdaDefNode) {
				throw new Error(`FunctionOut node references non-existent lambda ${data.lambdaId}`);
			}
			const lambdaData = lambdaDefNode.data as LambdaDefNodeData;
			const functionName = lambdaData.functionName || 'unnamed';
			return {
				type: 'Identifier',
				name: functionName
			} as Identifier;
		}
		// If accessing without 'function' handle, it's an error
		throw new Error('FunctionOut node can only be accessed via "function" handle in expressions');
	}

		case 'dynamicFunction': {
			const data = node.data as DynamicFunctionNodeData;
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
				return convertNode(sourceNode as FlowNode, allNodes, incomingEdges, edge.sourceHandle || undefined);
			});

			// Check if functionName already includes namespace
			const functionName = data.functionName.includes('::') 
				? data.functionName 
				: (data.namespace ? `${data.namespace}::${data.functionName}` : data.functionName);

			return {
				type: 'FunctionCall',
				function: functionName,
				args
			} as FunctionCall;
		}

		case 'customFunction': {
			const data = node.data as CustomFunctionNodeData;
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
				return convertNode(sourceNode as FlowNode, allNodes, incomingEdges, edge.sourceHandle || undefined);
			});

			return {
				type: 'FunctionCall',
				function: data.functionName || 'unknown',
				args
			} as FunctionCall;
		}

		case 'applyFunc': {
			const edges = incomingEdges.get(node.id) || [];

			// Get the function value from 'func' handle
			const funcEdge = edges.find(e => e.targetHandle === 'func');
			if (!funcEdge) {
				throw new Error(`Apply node ${node.id} has no function input`);
			}

			const funcNode = allNodes.find(n => n.id === funcEdge.source);
			if (!funcNode) {
				throw new Error(`Apply node ${node.id} function node not found`);
			}

			// Convert function expression
			const funcExpr = convertNode(funcNode as FlowNode, allNodes, incomingEdges, funcEdge.sourceHandle || undefined);

			// Get arguments
			const argEdges = edges
				.filter(e => e.targetHandle?.startsWith('arg'))
				.sort((a, b) => {
					const aIndex = parseInt(a.targetHandle?.replace('arg', '') || '0');
					const bIndex = parseInt(b.targetHandle?.replace('arg', '') || '0');
					return aIndex - bIndex;
				});

			const args: ASTNode[] = argEdges.map(edge => {
				const sourceNode = allNodes.find(n => n.id === edge.source);
				if (!sourceNode) {
					throw new Error(`Source node ${edge.source} not found`);
				}
				return convertNode(sourceNode as FlowNode, allNodes, incomingEdges, edge.sourceHandle || undefined);
			});

			return {
				type: 'FunctionCall',
				function: funcExpr,  // Function is an expression, not a string
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
				condition: convertNode(conditionNode as FlowNode, allNodes, incomingEdges, conditionEdge.sourceHandle || undefined),
				thenBranch: convertNode(thenNode as FlowNode, allNodes, incomingEdges, thenEdge.sourceHandle || undefined),
				elseBranch: convertNode(elseNode as FlowNode, allNodes, incomingEdges, elseEdge.sourceHandle || undefined)
			} as IfExpression;
		}

		default:
			throw new Error(`Unknown node type: ${(node as any).type}`);
	}
}
