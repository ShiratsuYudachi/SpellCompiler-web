// =============================================
// Pure Functional AST
// 纯函数式 AST - 只有表达式，没有语句
// =============================================

// Base interface for all AST nodes
export interface BaseASTNode {
	type: string;
}

// =============================================
// AST Node Types (所有节点都是表达式)
// =============================================

export type ASTNode = 
	| Literal 
	| Identifier
	| FunctionCall 
	| IfExpression;

// =============================================
// 1. Literal (字面量)
// =============================================

export interface Literal extends BaseASTNode {
	type: 'Literal';
	value: number | string | boolean;
	valueType: 'number' | 'string' | 'boolean';
}

// =============================================
// 2. Identifier (标识符引用)
// 用于引用参数、函数等
// 会先在局部环境中查找（参数），再在全局函数表中查找（函数）
// =============================================

export interface Identifier extends BaseASTNode {
	type: 'Identifier';
	name: string;  // 标识符名称
}

// =============================================
// 3. Function Call (函数调用)
// 可以调用任何表达式求值后得到的函数
// 包括所有运算（加减乘除、比较、逻辑等）
// =============================================

export interface FunctionCall extends BaseASTNode {
	type: 'FunctionCall';
	function: ASTNode | string;  // 函数表达式（可以是 Identifier）或函数名字符串（语法糖）
	args: ASTNode[];             // 参数列表
}

// =============================================
// 4. If Expression (条件表达式，类似三元运算符)
// 返回 then 或 else 分支的值
// 会惰性求值
// =============================================

export interface IfExpression extends BaseASTNode {
	type: 'IfExpression';
	condition: ASTNode;
	thenBranch: ASTNode;
	elseBranch: ASTNode;
}

// =============================================
// Function Definition (函数定义)
// 注意：这不是 AST 节点，而是存储在全局函数表中的数据结构
// =============================================

export interface FunctionDefinition {
	name: string;           // 函数名
	params: string[];       // 参数名列表
	body: ASTNode;          // 函数体（AST 表达式）
}

// =============================================
// Value Type (求值结果类型)
// 函数也是值（一等公民）
// =============================================

export type Value = 
	| number 
	| string 
	| boolean 
	| Value[] 
	| FunctionValue;

// Function as a value
export interface FunctionValue {
	type: 'function';
	definition: FunctionDefinition;
}
