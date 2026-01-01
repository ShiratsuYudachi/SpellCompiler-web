// =============================================
// AST to Mermaid Tests
// AST  Mermaid 
// =============================================

import { astToMermaid } from '../utils/astToMermaid';
import { runner, expect } from './framework';
import type { Literal, Identifier, FunctionCall, IfExpression, Lambda, FunctionDefinition } from '../ast/ast';

// =============================================
// Test Suite
// =============================================

runner.suite('astToMermaid - Basic Nodes', (suite) => {
	suite.test('converts literal node', () => {
		const ast: Literal = {
			type: 'Literal',
			value: 42
		};

		const result = astToMermaid(ast);

		expect(result).toContain('graph TD');
		expect(result).toContain('42');
	});

	suite.test('converts string literal', () => {
		const ast: Literal = {
			type: 'Literal',
			value: 'hello'
		};

		const result = astToMermaid(ast);

		expect(result).toContain('graph TD');
		expect(result).toContain('"hello"');
	});

	suite.test('converts boolean literal', () => {
		const ast: Literal = {
			type: 'Literal',
			value: true
		};

		const result = astToMermaid(ast);

		expect(result).toContain('graph TD');
		expect(result).toContain('true');
	});

	suite.test('converts identifier', () => {
		const ast: Identifier = {
			type: 'Identifier',
			name: 'x'
		};

		const result = astToMermaid(ast);

		expect(result).toContain('graph TD');
		expect(result).toContain('x');
	});
});

runner.suite('astToMermaid - Function Calls', (suite) => {
	suite.test('converts simple function call', () => {
		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'std::add',
			args: [
				{ type: 'Literal', value: 5 },
				{ type: 'Literal', value: 3 }
			]
		};

		const result = astToMermaid(ast);

		expect(result).toContain('graph TD');
		expect(result).toContain('std::add');
		expect(result).toContain('5');
		expect(result).toContain('3');
	});

	suite.test('converts nested function call', () => {
		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'std::multiply',
			args: [
				{
					type: 'FunctionCall',
					function: 'std::add',
					args: [
						{ type: 'Literal', value: 5 },
						{ type: 'Literal', value: 3 }
					]
				},
				{ type: 'Literal', value: 2 }
			]
		};

		const result = astToMermaid(ast);

		expect(result).toContain('std::multiply');
		expect(result).toContain('std::add');
	});

	suite.test('converts function call with identifier', () => {
		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'myFunc',
			args: [
				{ type: 'Identifier', name: 'x' }
			]
		};

		const result = astToMermaid(ast);

		expect(result).toContain('myFunc');
		expect(result).toContain('x');
	});
});

runner.suite('astToMermaid - If Expression', (suite) => {
	suite.test('converts if expression', () => {
		const ast: IfExpression = {
			type: 'IfExpression',
			condition: { type: 'Literal', value: true },
			thenBranch: { type: 'Literal', value: 10 },
			elseBranch: { type: 'Literal', value: 20 }
		};

		const result = astToMermaid(ast);

		expect(result).toContain('if');
		expect(result).toContain('10');
		expect(result).toContain('20');
		expect(result).toContain('condition');
		expect(result).toContain('then');
		expect(result).toContain('else');
	});

	suite.test('converts nested if expression', () => {
		const ast: IfExpression = {
			type: 'IfExpression',
			condition: { type: 'Literal', value: true },
			thenBranch: {
				type: 'IfExpression',
				condition: { type: 'Literal', value: false },
				thenBranch: { type: 'Literal', value: 1 },
				elseBranch: { type: 'Literal', value: 2 }
			},
			elseBranch: { type: 'Literal', value: 3 }
		};

		const result = astToMermaid(ast);

		expect(result).toContain('if');
		// Should have multiple if nodes
		const ifCount = (result.match(/if/g) || []).length;
		expect(ifCount).toBe(2); // Two if expressions
	});
});

runner.suite('astToMermaid - Lambda', (suite) => {
	suite.test('converts lambda with no params', () => {
		const ast: Lambda = {
			type: 'Lambda',
			params: [],
			body: { type: 'Literal', value: 42 }
		};

		const result = astToMermaid(ast);

		expect(result).toContain('λ');
		expect(result).toContain('no params');
		expect(result).toContain('42');
	});

	suite.test('converts lambda with single param', () => {
		const ast: Lambda = {
			type: 'Lambda',
			params: ['x'],
			body: { type: 'Identifier', name: 'x' }
		};

		const result = astToMermaid(ast);

		expect(result).toContain('λ');
		expect(result).toContain('x');
		expect(result).toContain('body');
	});

	suite.test('converts lambda with multiple params', () => {
		const ast: Lambda = {
			type: 'Lambda',
			params: ['x', 'y'],
			body: {
				type: 'FunctionCall',
				function: 'std::add',
				args: [
					{ type: 'Identifier', name: 'x' },
					{ type: 'Identifier', name: 'y' }
				]
			}
		};

		const result = astToMermaid(ast);

		expect(result).toContain('λ');
		expect(result).toContain('x, y');
		expect(result).toContain('std::add');
	});

	suite.test('converts nested lambda', () => {
		const ast: Lambda = {
			type: 'Lambda',
			params: ['x'],
			body: {
				type: 'Lambda',
				params: ['y'],
				body: {
					type: 'FunctionCall',
					function: 'std::add',
					args: [
						{ type: 'Identifier', name: 'x' },
						{ type: 'Identifier', name: 'y' }
					]
				}
			}
		};

		const result = astToMermaid(ast);

		expect(result).toContain('λ');
		// Should have two lambda nodes
		const lambdaCount = (result.match(/λ/g) || []).length;
		expect(lambdaCount).toBe(2);
	});
});

runner.suite('astToMermaid - Function Definitions', (suite) => {
	suite.test('converts function definition with main expression', () => {
		const functions: FunctionDefinition[] = [
			{
				name: 'increment',
				params: ['x'],
				body: {
					type: 'FunctionCall',
					function: 'std::add',
					args: [
						{ type: 'Identifier', name: 'x' },
						{ type: 'Literal', value: 1 }
					]
				}
			}
		];

		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'increment',
			args: [{ type: 'Literal', value: 5 }]
		};

		const result = astToMermaid(ast, functions);

		expect(result).toContain('Function: increment');
		expect(result).toContain('Parameters: x');
		expect(result).toContain('Main Expression');
		expect(result).toContain('std::add');
	});

	suite.test('converts multiple function definitions', () => {
		const functions: FunctionDefinition[] = [
			{
				name: 'double',
				params: ['x'],
				body: {
					type: 'FunctionCall',
					function: 'std::multiply',
					args: [
						{ type: 'Identifier', name: 'x' },
						{ type: 'Literal', value: 2 }
					]
				}
			},
			{
				name: 'quadruple',
				params: ['x'],
				body: {
					type: 'FunctionCall',
					function: 'double',
					args: [
						{
							type: 'FunctionCall',
							function: 'double',
							args: [{ type: 'Identifier', name: 'x' }]
						}
					]
				}
			}
		];

		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'quadruple',
			args: [{ type: 'Literal', value: 5 }]
		};

		const result = astToMermaid(ast, functions);

		expect(result).toContain('Function: double');
		expect(result).toContain('Function: quadruple');
		// Should have both function subgraphs
		const funcCount = (result.match(/Function:/g) || []).length;
		expect(funcCount).toBe(2);
	});
});

runner.suite('astToMermaid - Complex Cases', (suite) => {
	suite.test('converts complex expression with if and function call', () => {
		const ast: IfExpression = {
			type: 'IfExpression',
			condition: {
				type: 'FunctionCall',
				function: 'std::gt',
				args: [
					{ type: 'Identifier', name: 'x' },
					{ type: 'Literal', value: 0 }
				]
			},
			thenBranch: {
				type: 'FunctionCall',
				function: 'std::subtract',
				args: [
					{ type: 'Identifier', name: 'x' },
					{ type: 'Literal', value: 1 }
				]
			},
			elseBranch: { type: 'Identifier', name: 'x' }
		};

		const result = astToMermaid(ast);

		expect(result).toContain('if');
		expect(result).toContain('std::gt');
		expect(result).toContain('std::subtract');
	});

	suite.test('generates valid mermaid syntax', () => {
		const ast: FunctionCall = {
			type: 'FunctionCall',
			function: 'test',
			args: [
				{ type: 'Literal', value: 42 }
			]
		};

		const result = astToMermaid(ast);

		// Should start with graph declaration
		expect(result.startsWith('graph TD')).toBe(true);
		
		// Should not have syntax errors (basic check)
		expect(result.includes('undefined')).toBe(false);
		expect(result.includes('null')).toBe(false);
	});
});

