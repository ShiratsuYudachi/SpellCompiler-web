// =============================================
// AST Node Type Definitions
// =============================================

// Base interface for all AST nodes
export interface ASTNode {
  type: string;
  location?: {
    line: number;
    column: number;
  };
}

// =============================================
// Statement (语句) - 不返回值，改变程序状态
// =============================================

export type Statement = 
  | AssignmentStatement 
  | IfStatement 
  | WhileStatement 
  | BlockStatement 
  | ExpressionStatement;

// 赋值语句: a = 5
export interface AssignmentStatement extends ASTNode {
  type: 'AssignmentStatement';
  left: Identifier;        // 被赋值的变量
  right: Expression;       // 赋值的表达式
}

// If语句: if (condition) { ... } else { ... }
export interface IfStatement extends ASTNode {
  type: 'IfStatement';
  condition: Expression;   // 条件表达式
  thenBranch: Statement;   // then分支
  elseBranch?: Statement;  // else分支（可选）
}

// While语句: while (condition) { ... }
export interface WhileStatement extends ASTNode {
  type: 'WhileStatement';
  condition: Expression;   // 循环条件
  body: Statement;         // 循环体
}

// 代码块: { statement1; statement2; }
export interface BlockStatement extends ASTNode {
  type: 'BlockStatement';
  statements: Statement[]; // 语句列表
}

// 表达式语句: func(); 或 x + 1;（表达式当作语句使用）
export interface ExpressionStatement extends ASTNode {
  type: 'ExpressionStatement';
  expression: Expression;
}

// =============================================
// Expression (表达式) - 返回值，不改变程序状态
// =============================================

export type Expression = 
  | Literal 
  | Identifier 
  | BinaryExpression 
  | FunctionCall 
  | UnaryExpression;

// 字面量: 123, "hello", true
export interface Literal extends ASTNode {
  type: 'Literal';
  value: number | string | boolean;
  dataType: 'number' | 'string' | 'boolean';
}

// 变量名: x, myVar
export interface Identifier extends ASTNode {
  type: 'Identifier';
  name: string;
}

// 二元运算: a + b, x > 0, y && z
export interface BinaryExpression extends ASTNode {
  type: 'BinaryExpression';
  operator: '+' | '-' | '*' | '/' | '>' | '<' | '==' | '&&' | '||';
  left: Expression;
  right: Expression;
}

// 函数调用: add(1, 2), print(x)
export interface FunctionCall extends ASTNode {
  type: 'FunctionCall';
  name: Identifier;        // 函数名
  arguments: Expression[]; // 参数列表
}

// 一元运算: !x, -y
export interface UnaryExpression extends ASTNode {
  type: 'UnaryExpression';
  operator: '!' | '-' | '+';
  operand: Expression;
}

// =============================================
// 程序根节点
// =============================================

export interface Program extends ASTNode {
  type: 'Program';
  body: Statement[];       // 顶层语句列表
}

// =============================================
// Evaluation Result Type
// =============================================

export type EvaluationResult = number | string | boolean | null | undefined;
