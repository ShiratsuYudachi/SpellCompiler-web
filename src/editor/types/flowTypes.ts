// =============================================
// React Flow Node Types
// 
// =============================================

import type { Node } from 'reactflow';

/**
 * Base node data interface
 */
export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
}

/**
 * Literal Node - 数字字面量
 */
export interface LiteralNodeData extends BaseNodeData {
	value: number | string | boolean;
}

/**
 * Identifier Node - （）
 */
export interface IdentifierNodeData extends BaseNodeData {
	name: string;
}

/**
 * If Expression Node - 
 */
export interface IfNodeData extends BaseNodeData {
	// No additional data needed
}

/**
 * Lambda Definition Node - Lambda 
 */
export interface LambdaDefNodeData extends BaseNodeData {
	functionName?: string;
	paramCount?: number;
	params?: string[];  // Parameter names
	// Note: Left handle for captured environment is implicit
}

/**
 * Function Output Node - （Return）
 *  Lambda 
 */
export interface FunctionOutNodeData extends BaseNodeData {
	functionName?: string;
	lambdaId?: string;  // Reference to the bound LambdaDef node
}

/**
 * Output Node - （）
 */
export interface OutputNodeData extends BaseNodeData {
	// No additional data needed
}

/**
 * Vector Node - 2D Vector
 */
export interface VectorNodeData extends BaseNodeData {
	x: number;
	y: number;
}

/**
 * Spell Input Node - Marks spell input parameters
 */
export interface SpellInputNodeData extends BaseNodeData {
	params?: string[]; // Parameter names, e.g., ['state', 'target', 'amount']
}

/**
 * All node types
 */
export type FlowNodeType =
	| 'literal'
	| 'identifier'
	| 'dynamicFunction'
	| 'customFunction'
	| 'applyFunc'
	| 'if'
	| 'lambdaDef'
	| 'functionOut'
	| 'output'
	| 'vector'
	| 'spellInput';

/**
 * Dynamic Function Node Data
 */
export interface DynamicFunctionNodeData extends BaseNodeData {
	functionName: string;
	displayName: string;
	namespace: string;
	params: string[];
	isVariadic?: boolean;
	parameterModes?: Record<string, { current: string; options: Array<{ mode: string; label: string; params: string[] }> }>;
}

/**
 * Custom Function Node Data - 
 */
export interface CustomFunctionNodeData extends BaseNodeData {
	functionName?: string;
	paramCount?: number;
}

/**
 * Apply Function Node Data - 
 * ，
 */
export interface ApplyFuncNodeData extends BaseNodeData {
	paramCount?: number;  // Number of arguments
}

/**
 * Typed node
 */
export type FlowNode =
	| Node<LiteralNodeData, 'literal'>
	| Node<IdentifierNodeData, 'identifier'>
	| Node<DynamicFunctionNodeData, 'dynamicFunction'>
	| Node<CustomFunctionNodeData, 'customFunction'>
	| Node<ApplyFuncNodeData, 'applyFunc'>
	| Node<IfNodeData, 'if'>
	| Node<LambdaDefNodeData, 'lambdaDef'>
	| Node<FunctionOutNodeData, 'functionOut'>
	| Node<OutputNodeData, 'output'>
	| Node<VectorNodeData, 'vector'>
	| Node<SpellInputNodeData, 'spellInput'>;

/**
 * Edge labels for better clarity
 */
export type EdgeLabel = 
	| 'arg0' | 'arg1' | 'arg2' | 'arg3'  // Function arguments
	| 'condition' | 'then' | 'else'      // If expression
	| 'body'                             // Function body
	| 'func'                             // Function value (for apply)
	| 'value';                           // General value flow
