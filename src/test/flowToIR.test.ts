// =============================================
// Flow to IR Tests
// flowToIR 转换测试
// =============================================

import type { Node, Edge } from 'reactflow';
import { flowToIR } from '../utils/flowToIR';
import { runner, expect } from './framework';
import type { Literal, Identifier, FunctionCall, IfExpression } from '../ast/ast';

// =============================================
// Test Suite
// =============================================

runner.suite('flowToIR - Basic Nodes', (suite) => {
	suite.test('converts literal node', () => {
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 0, y: 0 },
				data: {}
			},
			{
				id: 'literal-1',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 42 }
			}
		];

		const edges: Edge[] = [
			{
				id: 'e1',
				source: 'literal-1',
				target: 'output-1'
			}
		];

		const result = flowToIR(nodes, edges);

		expect(result.ast.type).toBe('Literal');
		expect((result.ast as Literal).value).toBe(42);
		expect(result.functions).toHaveLength(0);
	});

	suite.test('converts identifier node', () => {
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 0, y: 0 },
				data: {}
			},
			{
				id: 'identifier-1',
				type: 'identifier',
				position: { x: 0, y: 0 },
				data: { name: 'x' }
			}
		];

		const edges: Edge[] = [
			{
				id: 'e1',
				source: 'identifier-1',
				target: 'output-1'
			}
		];

		const result = flowToIR(nodes, edges);

		expect(result.ast.type).toBe('Identifier');
		expect((result.ast as Identifier).name).toBe('x');
	});

	suite.test('converts string literal', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 'hello' } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'literal-1', target: 'output-1' }
		];

		const result = flowToIR(nodes, edges);

		expect((result.ast as Literal).value).toBe('hello');
	});

	suite.test('converts boolean literal', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: true } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'literal-1', target: 'output-1' }
		];

		const result = flowToIR(nodes, edges);

		expect((result.ast as Literal).value).toBe(true);
	});
});

runner.suite('flowToIR - Function Calls', (suite) => {
	suite.test('converts simple function call (add)', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'add-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: {
					functionName: 'add',
					displayName: 'Add',
					namespace: 'std',
					params: ['a', 'b']
				}
			},
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } },
			{ id: 'literal-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'add-1', target: 'output-1', sourceHandle: 'result' },
			{ id: 'e2', source: 'literal-1', target: 'add-1', targetHandle: 'arg0' },
			{ id: 'e3', source: 'literal-2', target: 'add-1', targetHandle: 'arg1' }
		];

		const result = flowToIR(nodes, edges);

		expect(result.ast.type).toBe('FunctionCall');
		const call = result.ast as FunctionCall;
		expect(call.function).toBe('std::add');
		expect(call.args).toHaveLength(2);
		expect((call.args[0] as Literal).value).toBe(5);
		expect((call.args[1] as Literal).value).toBe(3);
	});

	suite.test('converts nested function call', () => {
		// (5 + 3) * 2
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'mul-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: {
					functionName: 'multiply',
					displayName: 'Multiply',
					namespace: 'std',
					params: ['a', 'b']
				}
			},
			{
				id: 'add-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: {
					functionName: 'add',
					displayName: 'Add',
					namespace: 'std',
					params: ['a', 'b']
				}
			},
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } },
			{ id: 'literal-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } },
			{ id: 'literal-3', type: 'literal', position: { x: 0, y: 0 }, data: { value: 2 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'mul-1', target: 'output-1' },
			{ id: 'e2', source: 'add-1', target: 'mul-1', targetHandle: 'arg0' },
			{ id: 'e3', source: 'literal-3', target: 'mul-1', targetHandle: 'arg1' },
			{ id: 'e4', source: 'literal-1', target: 'add-1', targetHandle: 'arg0' },
			{ id: 'e5', source: 'literal-2', target: 'add-1', targetHandle: 'arg1' }
		];

		const result = flowToIR(nodes, edges);

		expect(result.ast.type).toBe('FunctionCall');
		const mulCall = result.ast as FunctionCall;
		expect(mulCall.function).toBe('std::multiply');

		const addCall = mulCall.args[0] as FunctionCall;
		expect(addCall.type).toBe('FunctionCall');
		expect(addCall.function).toBe('std::add');
	});

	suite.test('converts custom function call', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'custom-1',
				type: 'customFunction',
				position: { x: 0, y: 0 },
				data: { functionName: 'myFunc', paramCount: 1 }
			},
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 10 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'custom-1', target: 'output-1' },
			{ id: 'e2', source: 'literal-1', target: 'custom-1', targetHandle: 'arg0' }
		];

		const result = flowToIR(nodes, edges);

		const call = result.ast as FunctionCall;
		expect(call.type).toBe('FunctionCall');
		expect(call.function).toBe('myFunc');
		expect(call.args).toHaveLength(1);
	});
});

runner.suite('flowToIR - ApplyFunc Node', (suite) => {
	suite.test('converts apply with identifier function', () => {
		// apply(f, 5) where f is an identifier
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'apply-1', type: 'applyFunc', position: { x: 0, y: 0 }, data: { paramCount: 1 } },
			{ id: 'func-id', type: 'identifier', position: { x: 0, y: 0 }, data: { name: 'f' } },
			{ id: 'arg-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'apply-1', target: 'output-1' },
			{ id: 'e2', source: 'func-id', target: 'apply-1', targetHandle: 'func' },
			{ id: 'e3', source: 'arg-1', target: 'apply-1', targetHandle: 'arg0' }
		];

		const result = flowToIR(nodes, edges);

		const call = result.ast as FunctionCall;
		expect(call.type).toBe('FunctionCall');
		expect((call.function as Identifier).type).toBe('Identifier');
		expect((call.function as Identifier).name).toBe('f');
		expect(call.args).toHaveLength(1);
		expect((call.args[0] as Literal).value).toBe(5);
	});

	suite.test('converts apply with custom function call result', () => {
		// apply(makeAdder(5), 3) - calling the result of a function
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'apply-1', type: 'applyFunc', position: { x: 0, y: 0 }, data: { paramCount: 1 } },
			{ id: 'makeAdder-1', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'makeAdder', paramCount: 1 } },
			{ id: 'lit-5', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } },
			{ id: 'lit-3', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'apply-1', target: 'output-1' },
			{ id: 'e2', source: 'makeAdder-1', target: 'apply-1', targetHandle: 'func' },
			{ id: 'e3', source: 'lit-5', target: 'makeAdder-1', targetHandle: 'arg0' },
			{ id: 'e4', source: 'lit-3', target: 'apply-1', targetHandle: 'arg0' }
		];

		const result = flowToIR(nodes, edges);

		const call = result.ast as FunctionCall;
		expect(call.type).toBe('FunctionCall');

		// Function is a FunctionCall
		const funcExpr = call.function as FunctionCall;
		expect(funcExpr.type).toBe('FunctionCall');
		expect(funcExpr.function).toBe('makeAdder');
		expect((funcExpr.args[0] as Literal).value).toBe(5);

		// Argument
		expect(call.args).toHaveLength(1);
		expect((call.args[0] as Literal).value).toBe(3);
	});

	suite.test('converts apply with multiple arguments', () => {
		// apply(f, 1, 2, 3)
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'apply-1', type: 'applyFunc', position: { x: 0, y: 0 }, data: { paramCount: 3 } },
			{ id: 'func-id', type: 'identifier', position: { x: 0, y: 0 }, data: { name: 'f' } },
			{ id: 'lit-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 1 } },
			{ id: 'lit-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 2 } },
			{ id: 'lit-3', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'apply-1', target: 'output-1' },
			{ id: 'e2', source: 'func-id', target: 'apply-1', targetHandle: 'func' },
			{ id: 'e3', source: 'lit-1', target: 'apply-1', targetHandle: 'arg0' },
			{ id: 'e4', source: 'lit-2', target: 'apply-1', targetHandle: 'arg1' },
			{ id: 'e5', source: 'lit-3', target: 'apply-1', targetHandle: 'arg2' }
		];

		const result = flowToIR(nodes, edges);

		const call = result.ast as FunctionCall;
		expect(call.args).toHaveLength(3);
		expect((call.args[0] as Literal).value).toBe(1);
		expect((call.args[1] as Literal).value).toBe(2);
		expect((call.args[2] as Literal).value).toBe(3);
	});

	suite.test('throws error when apply has no function input', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'apply-1', type: 'applyFunc', position: { x: 0, y: 0 }, data: { paramCount: 1 } },
			{ id: 'lit-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'apply-1', target: 'output-1' },
			{ id: 'e2', source: 'lit-1', target: 'apply-1', targetHandle: 'arg0' }
			// Missing func edge
		];

		expect(() => flowToIR(nodes, edges)).toThrow('has no function input');
	});
});

runner.suite('flowToIR - If Expression', (suite) => {
	suite.test('converts if expression', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'if-1', type: 'if', position: { x: 0, y: 0 }, data: {} },
			{ id: 'condition-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: true } },
			{ id: 'then-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 10 } },
			{ id: 'else-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 20 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'if-1', target: 'output-1' },
			{ id: 'e2', source: 'condition-1', target: 'if-1', targetHandle: 'condition' },
			{ id: 'e3', source: 'then-1', target: 'if-1', targetHandle: 'then' },
			{ id: 'e4', source: 'else-1', target: 'if-1', targetHandle: 'else' }
		];

		const result = flowToIR(nodes, edges);

		expect(result.ast.type).toBe('IfExpression');
		const ifExpr = result.ast as IfExpression;
		expect((ifExpr.condition as Literal).value).toBe(true);
		expect((ifExpr.thenBranch as Literal).value).toBe(10);
		expect((ifExpr.elseBranch as Literal).value).toBe(20);
	});

	suite.test('converts nested if expression', () => {
		// if (true) then (if (false) then 1 else 2) else 3
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'if-1', type: 'if', position: { x: 0, y: 0 }, data: {} },
			{ id: 'if-2', type: 'if', position: { x: 0, y: 0 }, data: {} },
			{ id: 'cond-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: true } },
			{ id: 'cond-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: false } },
			{ id: 'lit-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 1 } },
			{ id: 'lit-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 2 } },
			{ id: 'lit-3', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'if-1', target: 'output-1' },
			{ id: 'e2', source: 'cond-1', target: 'if-1', targetHandle: 'condition' },
			{ id: 'e3', source: 'if-2', target: 'if-1', targetHandle: 'then' },
			{ id: 'e4', source: 'lit-3', target: 'if-1', targetHandle: 'else' },
			{ id: 'e5', source: 'cond-2', target: 'if-2', targetHandle: 'condition' },
			{ id: 'e6', source: 'lit-1', target: 'if-2', targetHandle: 'then' },
			{ id: 'e7', source: 'lit-2', target: 'if-2', targetHandle: 'else' }
		];

		const result = flowToIR(nodes, edges);

		const outerIf = result.ast as IfExpression;
		expect(outerIf.type).toBe('IfExpression');

		const innerIf = outerIf.thenBranch as IfExpression;
		expect(innerIf.type).toBe('IfExpression');
		expect((innerIf.thenBranch as Literal).value).toBe(1);
	});
});

runner.suite('flowToIR - Lambda Definitions', (suite) => {
	suite.test('converts simple lambda definition', () => {
		// lambda (x) -> x + 1
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 0 },
				data: { functionName: 'increment', params: ['x'] }
			},
			{
				id: 'add-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: { functionName: 'add', displayName: 'Add', namespace: 'std', params: ['a', 'b'] }
			},
			{ id: 'return-1', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'lambda-1' } },
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 1 } },
			{ id: 'call-1', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'increment' } },
			{ id: 'arg-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } }
		];

		const edges: Edge[] = [
			// Lambda definition
			{ id: 'e1', source: 'lambda-1', target: 'add-1', targetHandle: 'arg0', sourceHandle: 'param0' },
			{ id: 'e2', source: 'literal-1', target: 'add-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'add-1', target: 'return-1', targetHandle: 'value' },
			// Call the function
			{ id: 'e4', source: 'arg-1', target: 'call-1', targetHandle: 'arg0' },
			{ id: 'e5', source: 'call-1', target: 'output-1' }
		];

		const result = flowToIR(nodes, edges);

		// Check function definition
		expect(result.functions).toHaveLength(1);
		const funcDef = result.functions[0];
		expect(funcDef.name).toBe('increment');
		expect(funcDef.params).toHaveLength(1);
		expect(funcDef.params[0]).toBe('x');

		// Check function body
		expect(funcDef.body.type).toBe('FunctionCall');
		const bodyCall = funcDef.body as FunctionCall;
		expect(bodyCall.function).toBe('std::add');

		// Check main expression
		expect(result.ast.type).toBe('FunctionCall');
		const mainCall = result.ast as FunctionCall;
		expect(mainCall.function).toBe('increment');
	});

	suite.test('converts lambda with multiple parameters', () => {
		// lambda (x, y) -> x * y
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 0 },
				data: { functionName: 'multiply', params: ['x', 'y'] }
			},
			{
				id: 'mul-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: { functionName: 'multiply', displayName: 'Multiply', namespace: 'std', params: ['a', 'b'] }
			},
			{ id: 'return-1', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'lambda-1' } },
			{ id: 'call-1', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'multiply' } },
			{ id: 'arg-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 3 } },
			{ id: 'arg-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 4 } }
		];

		const edges: Edge[] = [
			// Lambda definition
			{ id: 'e1', source: 'lambda-1', target: 'mul-1', targetHandle: 'arg0', sourceHandle: 'param0' },
			{ id: 'e2', source: 'lambda-1', target: 'mul-1', targetHandle: 'arg1', sourceHandle: 'param1' },
			{ id: 'e3', source: 'mul-1', target: 'return-1', targetHandle: 'value' },
			// Call
			{ id: 'e4', source: 'arg-1', target: 'call-1', targetHandle: 'arg0' },
			{ id: 'e5', source: 'arg-2', target: 'call-1', targetHandle: 'arg1' },
			{ id: 'e6', source: 'call-1', target: 'output-1' }
		];

		const result = flowToIR(nodes, edges);

		expect(result.functions).toHaveLength(1);
		expect(result.functions[0].params).toHaveLength(2);
		expect(result.functions[0].params).toEqual(['x', 'y']);
	});

	suite.test('converts lambda calling another lambda', () => {
		// lambda double(x) -> x * 2
		// lambda quadruple(x) -> double(double(x))
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			// Double lambda
			{
				id: 'lambda-double',
				type: 'lambdaDef',
				position: { x: 0, y: 0 },
				data: { functionName: 'double', params: ['x'] }
			},
			{
				id: 'mul-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: { functionName: 'multiply', displayName: 'Multiply', namespace: 'std', params: ['a', 'b'] }
			},
			{ id: 'lit-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 2 } },
			{ id: 'return-double', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'lambda-double' } },
			// Quadruple lambda
			{
				id: 'lambda-quad',
				type: 'lambdaDef',
				position: { x: 0, y: 0 },
				data: { functionName: 'quadruple', params: ['x'] }
			},
			{ id: 'call-double-1', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'double' } },
			{ id: 'call-double-2', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'double' } },
			{ id: 'return-quad', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'lambda-quad' } },
			// Main call
			{ id: 'call-main', type: 'customFunction', position: { x: 0, y: 0 }, data: { functionName: 'quadruple' } },
			{ id: 'arg-main', type: 'literal', position: { x: 0, y: 0 }, data: { value: 5 } }
		];

		const edges: Edge[] = [
			// Double lambda
			{ id: 'e1', source: 'lambda-double', target: 'mul-1', targetHandle: 'arg0', sourceHandle: 'param0' },
			{ id: 'e2', source: 'lit-2', target: 'mul-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'mul-1', target: 'return-double', targetHandle: 'value' },
			// Quadruple lambda
			{ id: 'e4', source: 'lambda-quad', target: 'call-double-1', targetHandle: 'arg0', sourceHandle: 'param0' },
			{ id: 'e5', source: 'call-double-1', target: 'call-double-2', targetHandle: 'arg0' },
			{ id: 'e6', source: 'call-double-2', target: 'return-quad', targetHandle: 'value' },
			// Main call
			{ id: 'e7', source: 'arg-main', target: 'call-main', targetHandle: 'arg0' },
			{ id: 'e8', source: 'call-main', target: 'output-1' }
		];

		const result = flowToIR(nodes, edges);

		expect(result.functions).toHaveLength(2);
		
		const doubleFn = result.functions.find(f => f.name === 'double');
		expect(doubleFn).toBeTruthy();
		expect(doubleFn?.params).toEqual(['x']);

		const quadFn = result.functions.find(f => f.name === 'quadruple');
		expect(quadFn).toBeTruthy();
		expect(quadFn?.params).toEqual(['x']);
	});

	suite.test('converts lambda with if expression and apply', () => {
		// lambda (arg0) -> if (arg0 > 0) then (arg0 - 1) else arg0
		// apply(lambda, 20) should return 19
		const nodes: Node[] = [
			{ id: 'node-113', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{ id: 'node-100', type: 'lambdaDef', position: { x: 0, y: 0 }, data: { functionName: 'lambda', params: ['arg0'] } },
			{ id: 'node-101', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'node-100' } },
			{ id: 'node-102', type: 'applyFunc', position: { x: 0, y: 0 }, data: { paramCount: 1 } },
			{ id: 'lit-2', type: 'literal', position: { x: 0, y: 0 }, data: { value: 20 } },
			{ id: 'node-105', type: 'if', position: { x: 0, y: 0 }, data: {} },
			{ id: 'node-109', type: 'dynamicFunction', position: { x: 0, y: 0 }, data: { functionName: 'gt', namespace: 'std', params: ['a', 'b'] } },
			{ id: 'node-110', type: 'literal', position: { x: 0, y: 0 }, data: { value: 0 } },
			{ id: 'node-111', type: 'dynamicFunction', position: { x: 0, y: 0 }, data: { functionName: 'subtract', namespace: 'std', params: ['a', 'b'] } },
			{ id: 'node-112', type: 'literal', position: { x: 0, y: 0 }, data: { value: 1 } }
		];

		const edges: Edge[] = [
			// Lambda body: if condition
			{ id: 'e1', source: 'node-100', sourceHandle: 'param0', target: 'node-109', targetHandle: 'arg0' },
			{ id: 'e2', source: 'node-110', target: 'node-109', targetHandle: 'arg1' },
			{ id: 'e3', source: 'node-109', target: 'node-105', targetHandle: 'condition' },
			// Lambda body: then branch (arg0 - 1)
			{ id: 'e4', source: 'node-100', sourceHandle: 'param0', target: 'node-111', targetHandle: 'arg0' },
			{ id: 'e5', source: 'node-112', target: 'node-111', targetHandle: 'arg1' },
			{ id: 'e6', source: 'node-111', target: 'node-105', targetHandle: 'then' },
			// Lambda body: else branch (arg0)
			{ id: 'e7', source: 'node-100', sourceHandle: 'param0', target: 'node-105', targetHandle: 'else' },
			// Lambda return
			{ id: 'e8', source: 'node-105', target: 'node-101', targetHandle: 'value' },
			// Apply lambda with argument 20
			{ id: 'e9', source: 'node-101', sourceHandle: 'function', target: 'node-102', targetHandle: 'func' },
			{ id: 'e10', source: 'lit-2', target: 'node-102', targetHandle: 'arg0' },
			{ id: 'e11', source: 'node-102', target: 'node-113' }
		];

		const result = flowToIR(nodes, edges);

		// Check lambda definition
		expect(result.functions).toHaveLength(1);
		const lambdaFn = result.functions[0];
		expect(lambdaFn.name).toBe('lambda');
		expect(lambdaFn.params).toEqual(['arg0']);
		expect(lambdaFn.body.type).toBe('IfExpression');

		// Check main expression (apply)
		expect(result.ast.type).toBe('FunctionCall');
		const applyCall = result.ast as FunctionCall;
		expect((applyCall.args[0] as Literal).value).toBe(20);
	});
});

runner.suite('flowToIR - Edge Cases', (suite) => {
	suite.test('throws error when output node is missing', () => {
		const nodes: Node[] = [
			{ id: 'literal-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 42 } }
		];

		const edges: Edge[] = [];

		expect(() => flowToIR(nodes, edges)).toThrow('No output node found');
	});

	suite.test('throws error when output has no input', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} }
		];

		const edges: Edge[] = [];

		expect(() => flowToIR(nodes, edges)).toThrow('Output node has no input');
	});

	suite.test('throws error when function return has no value', () => {
		const nodes: Node[] = [
			{ id: 'output-1', type: 'output', position: { x: 0, y: 0 }, data: {} },
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 0 },
				data: { functionName: 'test', params: [] }
			},
			{ id: 'return-1', type: 'functionOut', position: { x: 0, y: 0 }, data: { lambdaId: 'lambda-1' } },
			{ id: 'lit-1', type: 'literal', position: { x: 0, y: 0 }, data: { value: 1 } }
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'lit-1', target: 'output-1' }
			// Missing edge to return node
		];

		expect(() => flowToIR(nodes, edges)).toThrow('Return node has no value connected');
	});
});
