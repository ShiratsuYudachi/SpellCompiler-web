// =============================================
// Basic AST Evaluator Example (No Variable Storage)
// =============================================

import type {
	ASTNode,
	Program,
	BlockStatement,
	IfStatement,
	ExpressionStatement,
	BinaryExpression,
	UnaryExpression,
	Literal,
	EvaluationResult
} from './ast';

// =============================================
// Basic Evaluator - Tests expressions without variables
// =============================================

class BasicEvaluator {
	evaluate(node: ASTNode): EvaluationResult {
		switch (node.type) {
			case 'Program':
				const program = node as Program;
				let result: EvaluationResult;
				for (const stmt of program.body) {
					result = this.evaluate(stmt);
				}
				return result;

			case 'BlockStatement':
				const block = node as BlockStatement;
				let blockResult: EvaluationResult;
				for (const stmt of block.statements) {
					blockResult = this.evaluate(stmt);
				}
				return blockResult;

			case 'IfStatement':
				const ifStmt = node as IfStatement;
				const condition = this.evaluate(ifStmt.condition);
				if (condition) {
					return this.evaluate(ifStmt.thenBranch);
				} else if (ifStmt.elseBranch) {
					return this.evaluate(ifStmt.elseBranch);
				}
				return undefined;

			case 'BinaryExpression':
				const binary = node as BinaryExpression;
				const left = this.evaluate(binary.left);
				const right = this.evaluate(binary.right);
				let binaryResult: EvaluationResult;
				switch (binary.operator) {
					case '+': binaryResult = (left as number) + (right as number); break;
					case '-': binaryResult = (left as number) - (right as number); break;
					case '*': binaryResult = (left as number) * (right as number); break;
					case '/': binaryResult = (left as number) / (right as number); break;
					case '>': binaryResult = (left as number) > (right as number); break;
					case '<': binaryResult = (left as number) < (right as number); break;
					case '==': binaryResult = left == right; break;
					case '&&': binaryResult = (left as boolean) && (right as boolean); break;
					case '||': binaryResult = (left as boolean) || (right as boolean); break;
					default: throw new Error(`Unknown operator: ${binary.operator}`);
				}
				console.log(`[BinaryExpr] ${left} ${binary.operator} ${right} = ${binaryResult}`);
				return binaryResult;

			case 'UnaryExpression':
				const unary = node as UnaryExpression;
				const operand = this.evaluate(unary.operand);
				let unaryResult: EvaluationResult;
				switch (unary.operator) {
					case '!': unaryResult = !(operand as boolean); break;
					case '-': unaryResult = -(operand as number); break;
					case '+': unaryResult = +(operand as number); break;
					default: throw new Error(`Unknown unary operator: ${unary.operator}`);
				}
				console.log(`[UnaryExpr] ${unary.operator}${operand} = ${unaryResult}`);
				return unaryResult;

			case 'Literal':
				const literal = node as Literal;
				return literal.value;

			case 'ExpressionStatement':
				const exprStmt = node as ExpressionStatement;
				const exprResult = this.evaluate(exprStmt.expression);
				console.log(`[ExpressionStmt] Result: ${exprResult}`);
				return exprResult;

			default:
				throw new Error(`Unknown node type: ${node.type}`);
		}
	}
}

// =============================================
// Test Example
// =============================================

// Test code:
// if (10 > 5) {
//     (3 + 7) * 2;      // = 20
//     -(5 - 3);         // = -2
// } else {
//     100;
// }
// 
// if (false || true) {
//     !false;           // = true
// }

const exampleAST: Program = {
	type: 'Program',
	body: [
		// Test 1: If statement with binary expressions and arithmetic
		{
			type: 'IfStatement',
			condition: {
				type: 'BinaryExpression',
				operator: '>',
				left: {
					type: 'Literal',
					value: 10,
					dataType: 'number'
				},
				right: {
					type: 'Literal',
					value: 5,
					dataType: 'number'
				}
			},
			thenBranch: {
				type: 'BlockStatement',
				statements: [
					// Test arithmetic with temporary values: (3 + 7) * 2
					{
						type: 'ExpressionStatement',
						expression: {
							type: 'BinaryExpression',
							operator: '*',
							left: {
								type: 'BinaryExpression',
								operator: '+',
								left: {
									type: 'Literal',
									value: 3,
									dataType: 'number'
								},
								right: {
									type: 'Literal',
									value: 7,
									dataType: 'number'
								}
							},
							right: {
								type: 'Literal',
								value: 2,
								dataType: 'number'
							}
						}
					},
					// Test unary expression: -(5 - 3)
					{
						type: 'ExpressionStatement',
						expression: {
							type: 'UnaryExpression',
							operator: '-',
							operand: {
								type: 'BinaryExpression',
								operator: '-',
								left: {
									type: 'Literal',
									value: 5,
									dataType: 'number'
								},
								right: {
									type: 'Literal',
									value: 3,
									dataType: 'number'
								}
							}
						}
					}
				]
			},
			elseBranch: {
				type: 'ExpressionStatement',
				expression: {
					type: 'Literal',
					value: 100,
					dataType: 'number'
				}
			}
		},
		// Test 2: Logical operators and unary not
		{
			type: 'IfStatement',
			condition: {
				type: 'BinaryExpression',
				operator: '||',
				left: {
					type: 'Literal',
					value: false,
					dataType: 'boolean'
				},
				right: {
					type: 'Literal',
					value: true,
					dataType: 'boolean'
				}
			},
			thenBranch: {
				type: 'ExpressionStatement',
				expression: {
					type: 'UnaryExpression',
					operator: '!',
					operand: {
						type: 'Literal',
						value: false,
						dataType: 'boolean'
					}
				}
			}
		}
	]
};

// Run test
console.log('=== Testing Basic AST Evaluator ===\n');
const evaluator = new BasicEvaluator();
evaluator.evaluate(exampleAST);
console.log('\n=== Testing Complete ===');
