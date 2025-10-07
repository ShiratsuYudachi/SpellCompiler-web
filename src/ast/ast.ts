// =============================================
// This is not Abstract Syntax Tree, I call it Abstract Spell Tree :P
// =============================================

export interface BaseASTNode {
	type: string;
}

// AST Node Types (所有节点都是表达式)
export type ASTNode = 
	| Literal 
	| Identifier
	| FunctionCall 
	| IfExpression;


export interface Literal extends BaseASTNode {
	type: 'Literal';
	value: any;  // 任意类型，由上层保证类型正确
}

// 用于引用参数、函数等
export interface Identifier extends BaseASTNode {
	type: 'Identifier';
	name: string;  // 标识符名称
}

export interface FunctionCall extends BaseASTNode {
	type: 'FunctionCall';
	function: ASTNode | string;  // 函数表达式（可以是 Identifier）或函数名字符串（语法糖）
	args: ASTNode[];             // 参数列表
}

// 4. If Expression (条件表达式，类似三元运算符)
// 返回 then 或 else 分支的值
// 会惰性求值
export interface IfExpression extends BaseASTNode {
	type: 'IfExpression';
	condition: ASTNode;
	thenBranch: ASTNode;
	elseBranch: ASTNode;
}


// =============================================
// 以下不属于AST节点
// =============================================

// Function Definition (函数定义)
export interface FunctionDefinition {
	name: string;           // 函数名
	params: string[];       // 参数名列表
	body: ASTNode;          // 函数体（AST 表达式）
}


// Value Type (求值结果类型)
// 函数也是值（一等公民）
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
