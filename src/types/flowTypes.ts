// =============================================
// React Flow Node Types
// 基础节点类型定义
// =============================================

import type { Node } from 'reactflow';

/**
 * Base node data interface
 */
export interface BaseNodeData extends Record<string, unknown> {
	label?: string;
}

/**
 * Literal Node - 字面量节点
 */
export interface LiteralNodeData extends BaseNodeData {
	value: number | string | boolean;
}

/**
 * Identifier Node - 标识符节点（参数引用）
 */
export interface IdentifierNodeData extends BaseNodeData {
	name: string;
}

/**
 * If Expression Node - 条件表达式节点
 */
export interface IfNodeData extends BaseNodeData {
	// No additional data needed
}

/**
 * Lambda Definition Node - Lambda 定义节点
 */
export interface LambdaDefNodeData extends BaseNodeData {
	functionName?: string;
	paramCount?: number;
	params?: string[];  // Parameter names
	// Note: Left handle for captured environment is implicit
}

/**
 * Function Output Node - 函数输出节点（Return）
 * 绑定到一个 Lambda 定义
 */
export interface FunctionOutNodeData extends BaseNodeData {
	functionName?: string;
	lambdaId?: string;  // Reference to the bound LambdaDef node
}

/**
 * Output Node - 输出节点（用于标记表达式的最终输出）
 */
export interface OutputNodeData extends BaseNodeData {
	// No additional data needed
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
	| 'output';

/**
 * Dynamic Function Node Data
 */
export interface DynamicFunctionNodeData extends BaseNodeData {
	functionName: string;
	displayName: string;
	namespace: string;
	params: string[];
	isVariadic?: boolean;
}

/**
 * Custom Function Node Data - 用户自定义函数调用
 */
export interface CustomFunctionNodeData extends BaseNodeData {
	functionName?: string;
	paramCount?: number;
}

/**
 * Apply Function Node Data - 动态函数应用
 * 接收一个函数值和参数，然后调用该函数
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
	| Node<OutputNodeData, 'output'>;

/**
 * Edge labels for better clarity
 */
export type EdgeLabel = 
	| 'arg0' | 'arg1' | 'arg2' | 'arg3'  // Function arguments
	| 'condition' | 'then' | 'else'      // If expression
	| 'body'                             // Function body
	| 'func'                             // Function value (for apply)
	| 'value';                           // General value flow
