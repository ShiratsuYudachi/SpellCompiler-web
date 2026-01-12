// =============================================
// Lambda Expression Tests
//  Lambda 
// =============================================

import { Evaluator } from './evaluator';
import type { Lambda, FunctionCall } from './ast';

const evaluator = new Evaluator();

console.log('=== Lambda Expression Tests ===\n');

// ============================================
// Test 1: Simple Lambda
// ============================================
console.log('Test 1: Simple Lambda');
console.log('Code: ((x) => x + 1)(5)');

const lambda1: Lambda = {
	type: 'Lambda',
	params: ['x'],
	body: {
		type: 'FunctionCall',
		function: 'std::math::add',
		args: [
			{ type: 'Identifier', name: 'x' },
			{ type: 'Literal', value: 1 }
		]
	} as FunctionCall
};

const call1: FunctionCall = {
	type: 'FunctionCall',
	function: lambda1,
	args: [{ type: 'Literal', value: 5 }]
};

const result1 = evaluator.run(call1);
console.log('Result:', result1);
console.log('Expected: 6');
console.log('Pass:', result1 === 6 ? '✓' : '✗');
console.log();

// ============================================
// Test 2: Lambda with Multiple Parameters
// ============================================
console.log('Test 2: Lambda with Multiple Parameters');
console.log('Code: ((x, y) => x * y)(3, 4)');

const lambda2: Lambda = {
	type: 'Lambda',
	params: ['x', 'y'],
	body: {
		type: 'FunctionCall',
		function: 'std::math::multiply',
		args: [
			{ type: 'Identifier', name: 'x' },
			{ type: 'Identifier', name: 'y' }
		]
	} as FunctionCall
};

const call2: FunctionCall = {
	type: 'FunctionCall',
	function: lambda2,
	args: [
		{ type: 'Literal', value: 3 },
		{ type: 'Literal', value: 4 }
	]
};

const result2 = evaluator.run(call2);
console.log('Result:', result2);
console.log('Expected: 12');
console.log('Pass:', result2 === 12 ? '✓' : '✗');
console.log();

// ============================================
// Test 3: Closure - Capture Environment
// ============================================
console.log('Test 3: Closure - Capture Environment');
console.log('Code: const makeAdder = (x) => (y) => x + y; makeAdder(5)(10)');

// Define makeAdder function
evaluator.registerFunction({
	name: 'makeAdder',
	params: ['x'],
	body: {
		type: 'Lambda',
		params: ['y'],
		body: {
			type: 'FunctionCall',
			function: 'std::math::add',
			args: [
				{ type: 'Identifier', name: 'x' },  // Captured variable
				{ type: 'Identifier', name: 'y' }
			]
		}
	}
});

// Call makeAdder(5) to get add5 function
const add5Call: FunctionCall = {
	type: 'FunctionCall',
	function: 'makeAdder',
	args: [{ type: 'Literal', value: 5 }]
};

const add5 = evaluator.run(add5Call);
console.log('add5 type:', typeof add5 === 'object' ? 'function' : typeof add5);

// Better approach: directly call the closure
if (typeof add5 === 'object' && (add5 as any).type === 'function') {
	
	// Manually create environment with the closure
	const tempEnv = new Map();
	tempEnv.set('temp', add5);
	
	// This is a workaround - we need better support for first-class functions
	console.log('Note: Full first-class function support requires more implementation');
	console.log('For now, closure is created but calling it requires additional work');
}
console.log();

// ============================================
// Test 4: Lambda Returning Lambda (Currying)
// ============================================
console.log('Test 4: Lambda Returning Lambda');
console.log('Code: ((x) => (y) => x + y)');

const curryLambda: Lambda = {
	type: 'Lambda',
	params: ['x'],
	body: {
		type: 'Lambda',
		params: ['y'],
		body: {
			type: 'FunctionCall',
			function: 'std::math::add',
			args: [
				{ type: 'Identifier', name: 'x' },
				{ type: 'Identifier', name: 'y' }
			]
		}
	}
};

const result4 = evaluator.run(curryLambda);
console.log('Result type:', typeof result4 === 'object' ? (result4 as any).type : typeof result4);
console.log('Is function:', typeof result4 === 'object' && (result4 as any).type === 'function' ? '✓' : '✗');
console.log('Expected: function value');
console.log();

// ============================================
// Test 5: Lambda in Variable (via function)
// ============================================
console.log('Test 5: Lambda Stored in Function Definition');
console.log('Code: const identity = (x) => x; identity(42)');

evaluator.registerFunction({
	name: 'identity',
	params: ['x'],
	body: { type: 'Identifier', name: 'x' }
});

const result5 = evaluator.callFunction('identity', 42);
console.log('Result:', result5);
console.log('Expected: 42');
console.log('Pass:', result5 === 42 ? '✓' : '✗');
console.log();

// ============================================
// Test 6: Nested Lambda with Closure
// ============================================
console.log('Test 6: Nested Lambda with Closure');
console.log('Code: const add = (a) => (b) => (c) => a + b + c');

evaluator.registerFunction({
	name: 'add3',
	params: ['a'],
	body: {
		type: 'Lambda',
		params: ['b'],
		body: {
			type: 'Lambda',
			params: ['c'],
			body: {
				type: 'FunctionCall',
				function: 'std::math::add',
				args: [
					{
						type: 'FunctionCall',
						function: 'std::math::add',
						args: [
							{ type: 'Identifier', name: 'a' },
							{ type: 'Identifier', name: 'b' }
						]
					},
					{ type: 'Identifier', name: 'c' }
				]
			}
		}
	}
});

console.log('Function registered: add3');
console.log('Note: Fully calling nested lambdas requires additional helper');
console.log();

// ============================================
// Test 7: Lambda as Argument
// ============================================
console.log('Test 7: Lambda as Function Argument');
console.log('Code: const apply = (f, x) => f(x); apply((x) => x * 2, 5)');

evaluator.registerFunction({
	name: 'apply',
	params: ['f', 'x'],
	body: {
		type: 'FunctionCall',
		function: { type: 'Identifier', name: 'f' },
		args: [{ type: 'Identifier', name: 'x' }]
	}
});

// Create a lambda that doubles its input
const doubleLambda: Lambda = {
	type: 'Lambda',
	params: ['x'],
	body: {
		type: 'FunctionCall',
		function: 'std::math::multiply',
		args: [
			{ type: 'Identifier', name: 'x' },
			{ type: 'Literal', value: 2 }
		]
	}
};

// Call apply with lambda and value
const applyCall: FunctionCall = {
	type: 'FunctionCall',
	function: 'apply',
	args: [
		doubleLambda,
		{ type: 'Literal', value: 5 }
	]
};

const result7 = evaluator.run(applyCall);
console.log('Result:', result7);
console.log('Expected: 10');
console.log('Pass:', result7 === 10 ? '✓' : '✗');
console.log();

// ============================================
// Test 8: Lambda Captures Multiple Variables
// ============================================
console.log('Test 8: Lambda Captures Multiple Variables');
console.log('Code: const makeCalculator = (a, b) => (op) => op(a, b)');

evaluator.registerFunction({
	name: 'makeCalculator',
	params: ['a', 'b'],
	body: {
		type: 'Lambda',
		params: ['op'],
		body: {
			type: 'FunctionCall',
			function: { type: 'Identifier', name: 'op' },
			args: [
				{ type: 'Identifier', name: 'a' },
				{ type: 'Identifier', name: 'b' }
			]
		}
	}
});

console.log('Function registered: makeCalculator');
console.log('This demonstrates closure capturing multiple variables');
console.log();

console.log('=== All Basic Lambda Tests Complete ===');

