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
	| IfExpression
	| Lambda;


// Primitive value type (简单值类型)
// Value 中排除 FunctionValue
export type PrimitiveValue = Exclude<Value, FunctionValue>;

// Literal (字面量：简单值)
// 不包括函数（函数用 Lambda 表示）
export interface Literal extends BaseASTNode {
	type: 'Literal';
	value: PrimitiveValue;  // 简单值，不包括 FunctionValue
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

// If Expression (条件表达式，类似三元运算符)
// 返回 then 或 else 分支的值
// 会惰性求值
export interface IfExpression extends BaseASTNode {
	type: 'IfExpression';
	condition: ASTNode;
	thenBranch: ASTNode;
	elseBranch: ASTNode;
}

// Lambda Expression (匿名函数表达式 / 函数字面量)
// Lambda 求值后产生 FunctionValue
// Lambda 是一等公民，可以作为值传递、返回、存储
export interface Lambda extends BaseASTNode {
	type: 'Lambda';
	params: string[];  // 参数名列表
	body: ASTNode;     // 函数体（任意表达式）
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


// Function as a value
export interface FunctionValue {
	type: 'function';
	definition: FunctionDefinition;
	capturedEnv?: Map<string, Value>;  // Captured environment for closures
}

// Value Type (求值结果类型)
// 函数也是值（一等公民）
export type Value = 
	| number 
	| string 
	| boolean 
	| Value[] 
	| FunctionValue;
