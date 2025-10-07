// =============================================
// Example Tests for Pure Functional Evaluator
// 纯函数式求值器测试例子
// =============================================

import { Evaluator } from './evaluator';
import type {
	ASTNode,
	FunctionDefinition,
	Literal,
	Identifier,
	FunctionCall,
	IfExpression,
	ListExpression
} from './ast';

// =============================================
// Helper Functions for Creating AST Nodes
// =============================================

function literal(value: number | string | boolean): Literal {
	return {
		type: 'Literal',
		value,
		valueType: typeof value as 'number' | 'string' | 'boolean'
	};
}

function identifier(name: string): Identifier {
	return {
		type: 'Identifier',
		name
	};
}

// Syntax sugar: call with function name string
function call(functionNameOrExpr: string | ASTNode, ...args: ASTNode[]): FunctionCall {
	return {
		type: 'FunctionCall',
		function: functionNameOrExpr,
		args
	};
}

function ifExpr(condition: ASTNode, thenBranch: ASTNode, elseBranch: ASTNode): IfExpression {
	return {
		type: 'IfExpression',
		condition,
		thenBranch,
		elseBranch
	};
}

function list(...elements: ASTNode[]): ListExpression {
	return {
		type: 'ListExpression',
		elements
	};
}

// =============================================
// Test Examples
// =============================================

function main() {
	const evaluator = new Evaluator();

	console.log('='.repeat(60));
	console.log('Pure Functional Evaluator - Test Examples');
	console.log('='.repeat(60));
	console.log();

	// ============================================
	// Test 1: Basic Arithmetic
	// ============================================
	console.log('📝 Test 1: Basic Arithmetic');
	console.log('-'.repeat(40));
	
	// multiply(add(3, 5), 2) = (3 + 5) * 2
	const expr1 = call('multiply',
		call('add', literal(3), literal(5)),
		literal(2)
	);
	console.log('Expression: multiply(add(3, 5), 2) = (3 + 5) * 2');
	console.log('Result:', evaluator.run(expr1));
	console.log();

	// ============================================
	// Test 2: Function Definition and Call
	// ============================================
	console.log('📝 Test 2: Function Definition and Call');
	console.log('-'.repeat(40));

	// Define: double(x) = multiply(x, 2)
	const doubleFn: FunctionDefinition = {
		name: 'double',
		params: ['x'],
		body: call('multiply', identifier('x'), literal(2))
	};
	evaluator.registerFunction(doubleFn);

	// Call: double(7)
	const expr2 = call('double', literal(7));
	console.log('Function: double(x) = multiply(x, 2)');
	console.log('Call: double(7)');
	console.log('Result:', evaluator.run(expr2));
	console.log();

	// ============================================
	// Test 3: Nested Function Calls
	// ============================================
	console.log('📝 Test 3: Nested Function Calls');
	console.log('-'.repeat(40));

	// Define: square(x) = multiply(x, x)
	const squareFn: FunctionDefinition = {
		name: 'square',
		params: ['x'],
		body: call('multiply', identifier('x'), identifier('x'))
	};
	evaluator.registerFunction(squareFn);

	// Call: square(double(3))
	const expr3 = call('square', call('double', literal(3)));
	console.log('Function: square(x) = multiply(x, x)');
	console.log('Call: square(double(3))');
	console.log('Result:', evaluator.run(expr3));
	console.log();

	// ============================================
	// Test 4: Conditional Expression (If)
	// ============================================
	console.log('📝 Test 4: Conditional Expression');
	console.log('-'.repeat(40));

	// Define: myAbs(x) = if gt(x, 0) then x else negate(x)
	const myAbsFn: FunctionDefinition = {
		name: 'myAbs',
		params: ['x'],
		body: ifExpr(
			call('gt', identifier('x'), literal(0)),
			identifier('x'),
			call('negate', identifier('x'))
		)
	};
	evaluator.registerFunction(myAbsFn);

	console.log('Function: myAbs(x) = if gt(x, 0) then x else negate(x)');
	console.log('Call: myAbs(5) =', evaluator.run(call('myAbs', literal(5))));
	console.log('Call: myAbs(-5) =', evaluator.run(call('myAbs', literal(-5))));
	console.log('Call: abs(5) =', evaluator.run(call('abs', literal(5))), '(from core library)');
	console.log('Call: abs(-5) =', evaluator.run(call('abs', literal(-5))), '(from core library)');
	console.log();

	// ============================================
	// Test 5: Multi-Parameter Function
	// ============================================
	console.log('📝 Test 5: Multi-Parameter Function');
	console.log('-'.repeat(40));

	// Using core library functions directly
	// Call: add(3, multiply(4, 5))
	const expr5 = call('add', literal(3), call('multiply', literal(4), literal(5)));
	console.log('Using core library: add, multiply');
	console.log('Call: add(3, multiply(4, 5))');
	console.log('Result:', evaluator.run(expr5));
	console.log();

	// ============================================
	// Test 6: Recursion (Factorial)
	// ============================================
	console.log('📝 Test 6: Recursion (Factorial)');
	console.log('-'.repeat(40));

	// Define: factorial(n) = if eq(n, 0) then 1 else multiply(n, factorial(subtract(n, 1)))
	const factorialFn: FunctionDefinition = {
		name: 'factorial',
		params: ['n'],
		body: ifExpr(
			call('eq', identifier('n'), literal(0)),
			literal(1),
			call('multiply',
				identifier('n'),
				call('factorial', call('subtract', identifier('n'), literal(1)))
			)
		)
	};
	evaluator.registerFunction(factorialFn);

	console.log('Function: factorial(n) = if eq(n, 0) then 1 else multiply(n, factorial(subtract(n, 1)))');
	console.log('Call: factorial(5) =', evaluator.run(call('factorial', literal(5))));
	console.log('Call: factorial(0) =', evaluator.run(call('factorial', literal(0))));
	console.log();

	// ============================================
	// Test 7: List Operations
	// ============================================
	console.log('📝 Test 7: List Operations');
	console.log('-'.repeat(40));

	const listExpr = list(literal(1), literal(2), literal(3), literal(4), literal(5));
	console.log('Expression: [1, 2, 3, 4, 5]');
	console.log('Result:', evaluator.run(listExpr));
	console.log();

	// ============================================
	// Test 8: Native Functions (Higher-Order)
	// ============================================
	console.log('📝 Test 8: Native Functions (Map)');
	console.log('-'.repeat(40));

	// Register native map function
	evaluator.registerNativeFunction('map', ['fnName', 'list'], (fnName, list) => {
		if (typeof fnName !== 'string') {
			throw new Error('First argument to map must be function name (string)');
		}
		if (!Array.isArray(list)) {
			throw new Error('Second argument to map must be list');
		}
		return list.map(item => evaluator.callFunction(fnName as string, item));
	});

	// Call: map("double", [1, 2, 3, 4])
	const expr8 = call('map', literal('double'), list(literal(1), literal(2), literal(3), literal(4)));
	console.log('Function: map(fnName, list) - native');
	console.log('Call: map("double", [1, 2, 3, 4])');
	console.log('Result:', evaluator.run(expr8));
	console.log();

	// ============================================
	// Test 9: Cache Performance
	// ============================================
	console.log('📝 Test 9: Cache Performance');
	console.log('-'.repeat(40));

	console.log('Calling factorial(5) again (should use cache)...');
	const startTime = Date.now();
	evaluator.run(call('factorial', literal(5)));
	const cachedTime = Date.now() - startTime;

	console.log('Time (cached):', cachedTime, 'ms');
	console.log('Cache stats:', evaluator.getCacheStats());
	console.log();

	// ============================================
	// Test 10: Complex Expression
	// ============================================
	console.log('📝 Test 10: Complex Expression');
	console.log('-'.repeat(40));

	// Using core library max function
	// Expression: max(square(3), double(8))
	const expr10 = call('max', call('square', literal(3)), call('double', literal(8)));
	console.log('Using core library: max');
	console.log('Call: max(square(3), double(8))');
	console.log('Result:', evaluator.run(expr10));
	console.log();

	// ============================================
	// Test 11: Boolean Logic
	// ============================================
	console.log('📝 Test 11: Boolean Logic');
	console.log('-'.repeat(40));

	// Define: isPositive(x) = gt(x, 0)
	const isPositiveFn: FunctionDefinition = {
		name: 'isPositive',
		params: ['x'],
		body: call('gt', identifier('x'), literal(0))
	};
	evaluator.registerFunction(isPositiveFn);

	// Define: isEven(x) = eq(mod(x, 2), 0)
	const isEvenFn: FunctionDefinition = {
		name: 'isEven',
		params: ['x'],
		body: call('eq', call('mod', identifier('x'), literal(2)), literal(0))
	};
	evaluator.registerFunction(isEvenFn);

	console.log('Function: isPositive(x) = gt(x, 0)');
	console.log('Function: isEven(x) = eq(mod(x, 2), 0)');
	console.log('Call: isPositive(5) =', evaluator.run(call('isPositive', literal(5))));
	console.log('Call: isPositive(-3) =', evaluator.run(call('isPositive', literal(-3))));
	console.log('Call: isEven(4) =', evaluator.run(call('isEven', literal(4))));
	console.log('Call: isEven(5) =', evaluator.run(call('isEven', literal(5))));
	console.log();

	// ============================================
	// Test 12: First-Class Functions (函数作为一等公民)
	// ============================================
	console.log('📝 Test 12: First-Class Functions');
	console.log('-'.repeat(40));

	// Define: applyTwice(fn, x) = fn(fn(x))
	const applyTwiceFn: FunctionDefinition = {
		name: 'applyTwice',
		params: ['fn', 'x'],
		body: call(identifier('fn'), call(identifier('fn'), identifier('x')))
	};
	evaluator.registerFunction(applyTwiceFn);

	console.log('Function: applyTwice(fn, x) = fn(fn(x))');
	console.log('Call: applyTwice(double, 3) =', evaluator.run(
		call('applyTwice', identifier('double'), literal(3))
	), '(double twice: 3 -> 6 -> 12)');
	console.log('Call: applyTwice(square, 2) =', evaluator.run(
		call('applyTwice', identifier('square'), literal(2))
	), '(square twice: 2 -> 4 -> 16)');
	console.log();

	// Define: compose(f, g, x) = f(g(x))
	const composeFn: FunctionDefinition = {
		name: 'compose',
		params: ['f', 'g', 'x'],
		body: call(identifier('f'), call(identifier('g'), identifier('x')))
	};
	evaluator.registerFunction(composeFn);

	console.log('Function: compose(f, g, x) = f(g(x))');
	console.log('Call: compose(square, double, 3) =', evaluator.run(
		call('compose', identifier('square'), identifier('double'), literal(3))
	), '(first double, then square: (3*2)^2 = 36)');
	console.log('Call: compose(double, square, 3) =', evaluator.run(
		call('compose', identifier('double'), identifier('square'), literal(3))
	), '(first square, then double: (3^2)*2 = 18)');
	console.log();

	// ============================================
	// Summary
	// ============================================
	console.log('='.repeat(60));
	console.log('✅ All tests completed!');
	console.log('Registered functions:', evaluator.getFunctionNames().join(', '));
	console.log('Cache size:', evaluator.getCacheStats().size);
	console.log('='.repeat(60));
}

// Run tests
main();
