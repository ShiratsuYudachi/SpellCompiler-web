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
 * Function Definition Node - 函数定义节点
 */
export interface FunctionDefNodeData extends BaseNodeData {
	functionName: string;
	params: string[];  // Parameter names
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
	| 'if'
	| 'functionDef'
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
 * Typed node
 */
export type FlowNode =
	| Node<LiteralNodeData, 'literal'>
	| Node<IdentifierNodeData, 'identifier'>
	| Node<DynamicFunctionNodeData, 'dynamicFunction'>
	| Node<IfNodeData, 'if'>
	| Node<FunctionDefNodeData, 'functionDef'>
	| Node<OutputNodeData, 'output'>;

/**
 * Edge labels for better clarity
 */
export type EdgeLabel = 
	| 'arg0' | 'arg1' | 'arg2' | 'arg3'  // Function arguments
	| 'condition' | 'then' | 'else'      // If expression
	| 'body'                             // Function body
	| 'value';                           // General value flow
