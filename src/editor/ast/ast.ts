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


// Primitive value type
// Excludes FunctionValue and GameState from Value
export type PrimitiveValue = Exclude<Value, FunctionValue | GameState>;

// Literal - primitive values only
// Functions are represented by Lambda nodes, not literals
export interface Literal extends BaseASTNode {
	type: 'Literal';
	value: PrimitiveValue;
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

// Spell - Top-level program node
// Represents a complete castable spell with input parameters
export interface Spell {
	params: string[];      // Parameter names (e.g., ['state', 'target', 'amount'])
	body: ASTNode;         // Main expression
	dependencies: FunctionDefinition[];  // Custom function definitions used by this spell
}

// GameState - Token/handle for game world context
// This is just a reference, not the actual state
export interface GameState {
	type: 'gamestate';
	__runtimeRef: symbol;  // Opaque reference to runtime context
}

// Function Definition
export interface FunctionDefinition {
	name: string;
	params: string[];
	body: ASTNode;
	
	// Type annotations (for documentation and future type checking)
	paramTypes?: string[];   // e.g., ['GameState', 'Vector2D', 'number']
	returnType?: string;     // e.g., 'GameState' or 'Entity' or 'number'
	
	// Internal: native implementation
	__native?: (...args: Value[]) => Value;
}

// Function as a value
export interface FunctionValue {
	type: 'function';
	definition: FunctionDefinition;
	capturedEnv?: Map<string, Value>;  // Captured environment for closures
}

// Simplified Value Type
// Vector2D and List are now implemented as FunctionValues
// Arrays removed - List is implemented functionally
export type Value =
	| number
	| string
	| boolean
	| FunctionValue
	| GameState;
