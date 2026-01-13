// Test tap node flowToIR conversion

import type { Node, Edge } from 'reactflow';
import { flowToIR } from '../utils/flowToIR';
import { Evaluator } from '../ast/evaluator';
import { runner, expect } from './framework';
import type { FunctionCall } from '../ast/ast';

runner.suite('flowToIR - Tap Node', (suite) => {
	suite.test('converts tap node with literal value and lambda', () => {
		// Create a flow: 
		// literal(42) -> tap(value, lambda(x -> x * 2)) -> output
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 400, y: 0 },
				data: {}
			},
			{
				id: 'tap-1',
				type: 'dynamicFunction',
				position: { x: 200, y: 0 },
				data: {
					functionName: 'tap',
					namespace: 'std'
				}
			},
			{
				id: 'literal-1',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 42 }
			},
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 100 },
				data: {
					name: 'sideEffect',
					functionName: 'sideEffect',
					params: ['x']
				}
			},
			{
				id: 'multiply-1',
				type: 'dynamicFunction',
				position: { x: 100, y: 100 },
				data: {
					functionName: 'multiply',
					namespace: 'std'
				}
			},
			{
				id: 'lambda-param-1',
				type: 'literal',
				position: { x: 50, y: 120 },
				data: { value: 2 }
			},
			{
				id: 'funcout-1',
				type: 'functionOut',
				position: { x: 200, y: 100 },
				data: { lambdaId: 'lambda-1' }
			}
		];

		const edges: Edge[] = [
			// Main flow: literal -> tap -> output
			{ id: 'e1', source: 'literal-1', target: 'tap-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'tap-1', target: 'output-1' },
			
			// Lambda function argument
			{ id: 'e3', source: 'funcout-1', sourceHandle: 'function', target: 'tap-1', targetHandle: 'arg1' },
			
			// Lambda body: param(x) -> multiply -> funcout
			{ id: 'e4', source: 'lambda-1', sourceHandle: 'param0', target: 'multiply-1', targetHandle: 'arg0' },
			{ id: 'e5', source: 'lambda-param-1', target: 'multiply-1', targetHandle: 'arg1' },
			{ id: 'e6', source: 'multiply-1', target: 'funcout-1', targetHandle: 'value' },
			
			// Connect lambda to funcout
			{ id: 'e7', source: 'lambda-1', target: 'funcout-1', targetHandle: 'lambdaDef' }
		];

		const result = flowToIR(nodes, edges);
		
		// Should be: tap(42, sideEffect)
		// Where sideEffect is registered as a function definition
		expect(result.ast.type).toBe('FunctionCall');
		const call = result.ast as FunctionCall;
		expect(call.function).toBe('std::tap');
		expect(call.args).toHaveLength(2);
		
		// First arg should be literal 42
		expect(call.args[0].type).toBe('Literal');
		
		// Second arg should be an Identifier referencing the lambda function
		expect(call.args[1].type).toBe('Identifier');
		
		// And there should be a function definition for the lambda
		expect(result.functions).toHaveLength(1);
		expect(result.functions[0].name).toBe('sideEffect');
	});

	suite.test('tap node in a pipeline converts correctly', () => {
		// Create a flow:
		// add(5, 3) -> tap(value, debug) -> multiply(result, 2) -> output
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 600, y: 0 },
				data: {}
			},
			{
				id: 'multiply-1',
				type: 'dynamicFunction',
				position: { x: 400, y: 0 },
				data: {
					functionName: 'multiply',
					namespace: 'std'
				}
			},
			{
				id: 'tap-1',
				type: 'dynamicFunction',
				position: { x: 200, y: 0 },
				data: {
					functionName: 'tap',
					namespace: 'std'
				}
			},
			{
				id: 'add-1',
				type: 'dynamicFunction',
				position: { x: 0, y: 0 },
				data: {
					functionName: 'add',
					namespace: 'std'
				}
			},
			{
				id: 'literal-5',
				type: 'literal',
				position: { x: -100, y: 0 },
				data: { value: 5 }
			},
			{
				id: 'literal-3',
				type: 'literal',
				position: { x: -100, y: 50 },
				data: { value: 3 }
			},
			{
				id: 'literal-2',
				type: 'literal',
				position: { x: 400, y: 50 },
				data: { value: 2 }
			},
			{
				id: 'lambda-debug',
				type: 'lambdaDef',
				position: { x: 100, y: 100 },
				data: {
					name: 'debugLambda',
					params: ['x']
				}
			},
			{
				id: 'debug-1',
				type: 'dynamicFunction',
				position: { x: 200, y: 100 },
				data: {
					functionName: 'debug',
					namespace: 'std'
				}
			},
			{
				id: 'debug-label',
				type: 'literal',
				position: { x: 100, y: 120 },
				data: { value: 'Intermediate' }
			},
			{
				id: 'funcout-1',
				type: 'functionOut',
				position: { x: 300, y: 100 },
				data: { lambdaId: 'lambda-debug' }
			}
		];

		const edges: Edge[] = [
			// Main flow
			{ id: 'e1', source: 'literal-5', target: 'add-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'literal-3', target: 'add-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'add-1', target: 'tap-1', targetHandle: 'arg0' },
			{ id: 'e4', source: 'funcout-1', sourceHandle: 'function', target: 'tap-1', targetHandle: 'arg1' },
			{ id: 'e5', source: 'tap-1', target: 'multiply-1', targetHandle: 'arg0' },
			{ id: 'e6', source: 'literal-2', target: 'multiply-1', targetHandle: 'arg1' },
			{ id: 'e7', source: 'multiply-1', target: 'output-1' },
			
			// Lambda body
			{ id: 'e8', source: 'debug-label', target: 'debug-1', targetHandle: 'arg0' },
			{ id: 'e9', source: 'lambda-debug', sourceHandle: 'param0', target: 'debug-1', targetHandle: 'arg1' },
			{ id: 'e10', source: 'debug-1', target: 'funcout-1', targetHandle: 'value' },
			{ id: 'e11', source: 'lambda-debug', target: 'funcout-1', targetHandle: 'lambdaDef' }
		];

		const result = flowToIR(nodes, edges);
		
		// Should be: multiply(tap(add(5, 3), lambda), 2)
		expect(result.ast.type).toBe('FunctionCall');
		const multiplyCall = result.ast as FunctionCall;
		expect(multiplyCall.function).toBe('std::multiply');
		
		// First arg should be tap call
		const tapCall = multiplyCall.args[0] as FunctionCall;
		expect(tapCall.type).toBe('FunctionCall');
		expect(tapCall.function).toBe('std::tap');
		
		// Tap's first arg should be add call
		const addCall = tapCall.args[0] as FunctionCall;
		expect(addCall.type).toBe('FunctionCall');
		expect(addCall.function).toBe('std::add');
	});

	suite.test('tap node execution produces correct result', () => {
		// Simple test: tap(42, identity) should return 42
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 300, y: 0 },
				data: {}
			},
			{
				id: 'tap-1',
				type: 'dynamicFunction',
				position: { x: 150, y: 0 },
				data: {
					functionName: 'tap',
					namespace: 'std'
				}
			},
			{
				id: 'literal-1',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 42 }
			},
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 100 },
				data: {
					name: 'identityLambda',
					params: ['x']
				}
			},
			{
				id: 'funcout-1',
				type: 'functionOut',
				position: { x: 100, y: 100 },
				data: { lambdaId: 'lambda-1' }
			}
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'literal-1', target: 'tap-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'funcout-1', sourceHandle: 'function', target: 'tap-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'tap-1', target: 'output-1' },
			{ id: 'e4', source: 'lambda-1', sourceHandle: 'param0', target: 'funcout-1', targetHandle: 'value' },
			{ id: 'e5', source: 'lambda-1', target: 'funcout-1', targetHandle: 'lambdaDef' }
		];

		const { ast, functions } = flowToIR(nodes, edges);
		
		// Execute with evaluator
		const evaluator = new Evaluator();
		functions.forEach(fn => evaluator.registerFunction(fn));
		const result = evaluator.run(ast);
		
		expect(result).toBe(42);
	});

	suite.test('tap node with debug function executes and returns value', () => {
		// Test: tap(10, lambda(x -> debug("Test", x))) should print and return 10
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 400, y: 0 },
				data: {}
			},
			{
				id: 'tap-1',
				type: 'dynamicFunction',
				position: { x: 200, y: 0 },
				data: {
					functionName: 'tap',
					namespace: 'std'
				}
			},
			{
				id: 'literal-10',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 10 }
			},
			{
				id: 'lambda-1',
				type: 'lambdaDef',
				position: { x: 0, y: 100 },
				data: {
					name: 'debugLambda',
					params: ['x']
				}
			},
			{
				id: 'debug-1',
				type: 'dynamicFunction',
				position: { x: 100, y: 100 },
				data: {
					functionName: 'debug',
					namespace: 'std'
				}
			},
			{
				id: 'debug-label',
				type: 'literal',
				position: { x: 50, y: 120 },
				data: { value: 'Test' }
			},
			{
				id: 'funcout-1',
				type: 'functionOut',
				position: { x: 200, y: 100 },
				data: { lambdaId: 'lambda-1' }
			}
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'literal-10', target: 'tap-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'funcout-1', sourceHandle: 'function', target: 'tap-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'tap-1', target: 'output-1' },
			{ id: 'e4', source: 'debug-label', target: 'debug-1', targetHandle: 'arg0' },
			{ id: 'e5', source: 'lambda-1', sourceHandle: 'param0', target: 'debug-1', targetHandle: 'arg1' },
			{ id: 'e6', source: 'debug-1', target: 'funcout-1', targetHandle: 'value' },
			{ id: 'e7', source: 'lambda-1', target: 'funcout-1', targetHandle: 'lambdaDef' }
		];

		const { ast, functions } = flowToIR(nodes, edges);
		
		// Execute
		const evaluator = new Evaluator();
		functions.forEach(fn => evaluator.registerFunction(fn));
		
		// Capture console.log
		const originalLog = console.log;
		let loggedTest = false;
		console.log = (...args: any[]) => {
			if (args[0] && args[0].includes('[DEBUG]')) {
				loggedTest = true;
			}
			// Also call original to see what's happening
			originalLog(...args);
		};
		
		const result = evaluator.run(ast);
		
		// Restore console.log
		console.log = originalLog;
		
		expect(result).toBe(10);
		expect(loggedTest).toBe(true);
	});
});

runner.suite('flowToIR - Other FP Utilities', (suite) => {
	suite.test('converts print node', () => {
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 200, y: 0 },
				data: {}
			},
			{
				id: 'print-1',
				type: 'dynamicFunction',
				position: { x: 100, y: 0 },
				data: {
					functionName: 'print',
					namespace: 'std'
				}
			},
			{
				id: 'literal-1',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 'hello' }
			}
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'literal-1', target: 'print-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'print-1', target: 'output-1' }
		];

		const { ast, functions } = flowToIR(nodes, edges);
		
		const evaluator = new Evaluator();
		functions.forEach(fn => evaluator.registerFunction(fn));
		
		// Capture console.log
		const originalLog = console.log;
		let printed = false;
		console.log = (value: any) => {
			if (value === 'hello') {
				printed = true;
			}
		};
		
		const result = evaluator.run(ast);
		
		// Restore console.log
		console.log = originalLog;
		
		expect(result).toBe('hello');
		expect(printed).toBe(true);
	});

	suite.test('converts debug node', () => {
		const nodes: Node[] = [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 300, y: 0 },
				data: {}
			},
			{
				id: 'debug-1',
				type: 'dynamicFunction',
				position: { x: 150, y: 0 },
				data: {
					functionName: 'debug',
					namespace: 'std'
				}
			},
			{
				id: 'label-1',
				type: 'literal',
				position: { x: 0, y: 0 },
				data: { value: 'MyValue' }
			},
			{
				id: 'literal-1',
				type: 'literal',
				position: { x: 0, y: 50 },
				data: { value: 123 }
			}
		];

		const edges: Edge[] = [
			{ id: 'e1', source: 'label-1', target: 'debug-1', targetHandle: 'arg0' },
			{ id: 'e2', source: 'literal-1', target: 'debug-1', targetHandle: 'arg1' },
			{ id: 'e3', source: 'debug-1', target: 'output-1' }
		];

		const { ast, functions } = flowToIR(nodes, edges);
		
		const evaluator = new Evaluator();
		functions.forEach(fn => evaluator.registerFunction(fn));
		const result = evaluator.run(ast);
		
		expect(result).toBe(123);
	});
});

