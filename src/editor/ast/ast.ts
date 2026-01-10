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
	| Lambda;


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

// Type guard for Vector2D
export function isVector2D(value: any): value is Vector2D {
	return value && typeof value === 'object' && value.type === 'vector2d' &&
		typeof value.x === 'number' && typeof value.y === 'number';
}

// Value Type ()
// （）
export type Value =
	| number
	| string
	| boolean
	| Value[]
	| FunctionValue
	| Vector2D;
