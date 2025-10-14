// =============================================
// Closure Support Test
// 测试闭包功能
// =============================================

import { Evaluator } from './evaluator';
import type { FunctionDefinition, Literal, FunctionCall, Identifier } from './ast';

// Helper functions
function literal(value: any): Literal {
	return { type: 'Literal', value };
}

function identifier(name: string): Identifier {
	return { type: 'Identifier', name };
}

function call(functionNameOrExpr: string | any, ...args: any[]): FunctionCall {
	return {
		type: 'FunctionCall',
		function: functionNameOrExpr,
		args
	};
}

console.log('='.repeat(60));
console.log('🧪 Testing Closure Support');
console.log('='.repeat(60));
console.log();

const evaluator = new Evaluator();

// ============================================
// Test 1: Basic Closure - makeAdder
// ============================================
console.log('📝 Test 1: Basic Closure - makeAdder(x) returns function(y) { x + y }');
console.log('-'.repeat(40));

// Define: makeAdder(x) = function(y) { return x + y }
const makeAdderFn: FunctionDefinition = {
	name: 'makeAdder',
	params: ['x'],
	body: literal({
		type: 'function',
		definition: {
			name: 'adder',
			params: ['y'],
			body: call('std::add', identifier('x'), identifier('y'))
		}
	})
};

evaluator.registerFunction(makeAdderFn);

// Test: const add5 = makeAdder(5)
const add5 = evaluator.run(call('makeAdder', literal(5)));
console.log('const add5 = makeAdder(5)');
console.log('add5:', add5);
console.log();

// Test: add5(3) should be 8
const result1 = evaluator.run(call(add5, literal(3)));
console.log('add5(3) =', result1, result1 === 8 ? '✅' : '❌ Expected 8');

// Test: add5(10) should be 15
const result2 = evaluator.run(call(add5, literal(10)));
console.log('add5(10) =', result2, result2 === 15 ? '✅' : '❌ Expected 15');
console.log();

// ============================================
// Test 2: Multiple Closures - Different Captures
// ============================================
console.log('📝 Test 2: Multiple Closures with Different Captured Values');
console.log('-'.repeat(40));

const add100 = evaluator.run(call('makeAdder', literal(100)));
const result3 = evaluator.run(call(add100, literal(5)));
console.log('const add100 = makeAdder(100)');
console.log('add100(5) =', result3, result3 === 105 ? '✅' : '❌ Expected 105');
console.log();

// Test that add5 still works correctly
const result4 = evaluator.run(call(add5, literal(7)));
console.log('add5(7) =', result4, result4 === 12 ? '✅' : '❌ Expected 12');
console.log();

// ============================================
// Test 3: Nested Closures
// ============================================
console.log('📝 Test 3: Nested Closures - makeAdder2(x)(y)(z)');
console.log('-'.repeat(40));

// Define: makeAdder2(x) = function(y) { return function(z) { return x + y + z } }
const makeAdder2Fn: FunctionDefinition = {
	name: 'makeAdder2',
	params: ['x'],
	body: literal({
		type: 'function',
		definition: {
			name: 'adder2_middle',
			params: ['y'],
			body: literal({
				type: 'function',
				definition: {
					name: 'adder2_inner',
					params: ['z'],
					body: call('std::add',
						call('std::add', identifier('x'), identifier('y')),
						identifier('z')
					)
				}
			})
		}
	})
};

evaluator.registerFunction(makeAdder2Fn);

// Test: makeAdder2(1)(2)(3) should be 6
const step1 = evaluator.run(call('makeAdder2', literal(1)));
console.log('const step1 = makeAdder2(1)');

const step2 = evaluator.run(call(step1, literal(2)));
console.log('const step2 = step1(2)');

const result5 = evaluator.run(call(step2, literal(3)));
console.log('step2(3) =', result5, result5 === 6 ? '✅' : '❌ Expected 6');
console.log();

// ============================================
// Test 4: Closure with Multiple Free Variables
// ============================================
console.log('📝 Test 4: Closure with Multiple Free Variables');
console.log('-'.repeat(40));

// Define: makeCalculator(a, b) = function(x) { return a * x + b }
const makeCalculatorFn: FunctionDefinition = {
	name: 'makeCalculator',
	params: ['a', 'b'],
	body: literal({
		type: 'function',
		definition: {
			name: 'calculator',
			params: ['x'],
			body: call('std::add',
				call('std::multiply', identifier('a'), identifier('x')),
				identifier('b')
			)
		}
	})
};

evaluator.registerFunction(makeCalculatorFn);

// Test: const calc = makeCalculator(2, 5)  => f(x) = 2x + 5
const calc = evaluator.run(call('makeCalculator', literal(2), literal(5)));
console.log('const calc = makeCalculator(2, 5)  // f(x) = 2x + 5');

const result6 = evaluator.run(call(calc, literal(3)));
console.log('calc(3) =', result6, result6 === 11 ? '✅' : '❌ Expected 11 (2*3+5)');

const result7 = evaluator.run(call(calc, literal(10)));
console.log('calc(10) =', result7, result7 === 25 ? '✅' : '❌ Expected 25 (2*10+5)');
console.log();

// ============================================
// Summary
// ============================================
console.log('='.repeat(60));
console.log('✅ All Closure Tests Completed!');
console.log('='.repeat(60));


