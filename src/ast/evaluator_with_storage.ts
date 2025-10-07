// =============================================
// AST Evaluator with Variable Storage
// =============================================

import type {
	ASTNode,
	Statement,
	Expression,
	Program,
	AssignmentStatement,
	IfStatement,
	WhileStatement,
	BlockStatement,
	ExpressionStatement,
	Literal,
	Identifier,
	BinaryExpression,
	FunctionCall,
	UnaryExpression,
	EvaluationResult
} from './ast';

// =============================================
// Evaluator with Global Variable Storage
// =============================================

class EvaluatorWithStorage {
	// Global variable storage (no scope concept)
	private variables: Map<string, EvaluationResult>;

	constructor() {
		this.variables = new Map();
	}

	// Get variable value
	getVariable(name: string): EvaluationResult {
		if (!this.variables.has(name)) {
			throw new Error(`Variable '${name}' is not defined`);
		}
		return this.variables.get(name);
	}

	// Set variable value
	setVariable(name: string, value: EvaluationResult): void {
		this.variables.set(name, value);
	}

	// Check if variable exists
	hasVariable(name: string): boolean {
		return this.variables.has(name);
	}

	// Get all variables (for debugging)
	getAllVariables(): Record<string, EvaluationResult> {
		const result: Record<string, EvaluationResult> = {};
		this.variables.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}

	// Clear all variables
	clearVariables(): void {
		this.variables.clear();
	}

	// Main evaluation method
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

			case 'WhileStatement':
				const whileStmt = node as WhileStatement;
				let whileResult: EvaluationResult;
				while (this.evaluate(whileStmt.condition)) {
					whileResult = this.evaluate(whileStmt.body);
				}
				return whileResult;

			case 'AssignmentStatement':
				const assignment = node as AssignmentStatement;
				const value = this.evaluate(assignment.right);
				this.setVariable(assignment.left.name, value);
				console.log(`[Assignment] ${assignment.left.name} = ${value}`);
				return value;

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
				return unaryResult;

			case 'FunctionCall':
				const funcCall = node as FunctionCall;
				console.log(`[FunctionCall] Not implemented: ${funcCall.name.name}`);
				return null;

			case 'Identifier':
				const identifier = node as Identifier;
				const varValue = this.getVariable(identifier.name);
				return varValue;

			case 'Literal':
				const literal = node as Literal;
				return literal.value;

			case 'ExpressionStatement':
				const exprStmt = node as ExpressionStatement;
				return this.evaluate(exprStmt.expression);

			default:
				throw new Error(`Unknown node type: ${node.type}`);
		}
	}
}

// =============================================
// Test Example with Variable Storage
// =============================================

// Test code:
// x = 10;
// y = x + 5;
// if (y > 12) {
//     z = y * 2;
// }
// result = z - x;

const testAST: Program = {
	type: 'Program',
	body: [
		// x = 10
		{
			type: 'AssignmentStatement',
			left: {
				type: 'Identifier',
				name: 'x'
			},
			right: {
				type: 'Literal',
				value: 10,
				dataType: 'number'
			}
		},
		// y = x + 5
		{
			type: 'AssignmentStatement',
			left: {
				type: 'Identifier',
				name: 'y'
			},
			right: {
				type: 'BinaryExpression',
				operator: '+',
				left: {
					type: 'Identifier',
					name: 'x'
				},
				right: {
					type: 'Literal',
					value: 5,
					dataType: 'number'
				}
			}
		},
		// if (y > 12) { z = y * 2; }
		{
			type: 'IfStatement',
			condition: {
				type: 'BinaryExpression',
				operator: '>',
				left: {
					type: 'Identifier',
					name: 'y'
				},
				right: {
					type: 'Literal',
					value: 12,
					dataType: 'number'
				}
			},
			thenBranch: {
				type: 'AssignmentStatement',
				left: {
					type: 'Identifier',
					name: 'z'
				},
				right: {
					type: 'BinaryExpression',
					operator: '*',
					left: {
						type: 'Identifier',
						name: 'y'
					},
					right: {
						type: 'Literal',
						value: 2,
						dataType: 'number'
					}
				}
			}
		},
		// result = z - x
		{
			type: 'AssignmentStatement',
			left: {
				type: 'Identifier',
				name: 'result'
			},
			right: {
				type: 'BinaryExpression',
				operator: '-',
				left: {
					type: 'Identifier',
					name: 'z'
				},
				right: {
					type: 'Identifier',
					name: 'x'
				}
			}
		}
	]
};

// Run test
console.log('=== Testing Evaluator with Variable Storage ===\n');
const evaluator = new EvaluatorWithStorage();
evaluator.evaluate(testAST);

console.log('\n=== All Variables ===');
console.log(evaluator.getAllVariables());
console.log('\n=== Testing Complete ===');
