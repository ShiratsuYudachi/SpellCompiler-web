// =============================================
// This is not Abstract Syntax Tree, I call it Abstract Spell Tree :P
// =============================================

export interface BaseASTNode {
	type: string;
}

// AST Node Types ()
export type ASTNode =
	| Literal
	| Identifier
	| FunctionCall
	| IfExpression
	| Lambda
	| Sequence;


// Primitive value type ()
// Value  FunctionValue
export type PrimitiveValue = Exclude<Value, FunctionValue>;

// Literal (：)
// （ Lambda ）
export interface Literal extends BaseASTNode {
	type: 'Literal';
	value: PrimitiveValue;  // ， FunctionValue
}

// 、
export interface Identifier extends BaseASTNode {
	type: 'Identifier';
	name: string;  // 
}

export interface FunctionCall extends BaseASTNode {
	type: 'FunctionCall';
	function: ASTNode | string;  // （ Identifier）（）
	args: ASTNode[];             // 
}

// If Expression (，)
//  then  else 
// 
export interface IfExpression extends BaseASTNode {
	type: 'IfExpression';
	condition: ASTNode;
	thenBranch: ASTNode;
	elseBranch: ASTNode;
}

// Lambda Expression ( / )
// Lambda  FunctionValue
// Lambda ，、、
export interface Lambda extends BaseASTNode {
	type: 'Lambda';
	params: string[];  //
	body: ASTNode;     // （）
}

// Sequence Expression (顺序执行多个表达式)
// 用于执行多个副作用操作，返回最后一个表达式的结果
export interface Sequence extends BaseASTNode {
	type: 'Sequence';
	expressions: ASTNode[];  // 按顺序执行的表达式列表
}


// =============================================
// AST
// =============================================



// Function Definition ()
export interface FunctionDefinition {
	name: string;           // 
	params: string[];       // 
	body: ASTNode;          // （AST ）
}


// Function as a value
export interface FunctionValue {
	type: 'function';
	definition: FunctionDefinition;
	capturedEnv?: Map<string, Value>;  // Captured environment for closures
}

// Vector2D Type - 2D Vector for positions, directions, etc.
export interface Vector2D {
	type: 'vector2d';
	x: number;
	y: number;
}

// AsyncOperation Type - Represents an operation that will complete in the future
export interface AsyncOperation {
	type: 'async';
	waitUntil: number;  // Timestamp (Date.now()) when this operation will complete
}

// Type guard for Vector2D
export function isVector2D(value: any): value is Vector2D {
	return value && typeof value === 'object' && value.type === 'vector2d' &&
		typeof value.x === 'number' && typeof value.y === 'number';
}

// Type guard for AsyncOperation
export function isAsyncOperation(value: any): value is AsyncOperation {
	return value && typeof value === 'object' && value.type === 'async' &&
		typeof value.waitUntil === 'number';
}

// Value Type ()
// （）
export type Value =
	| number
	| string
	| boolean
	| Value[]
	| FunctionValue
	| Vector2D
	| AsyncOperation;
