// =============================================
// Test std::this with Lambda Nodes
//  Lambda  std::this
// =============================================

import { Evaluator } from './evaluator';
import type { Lambda, FunctionCall, IfExpression } from './ast';

const evaluator = new Evaluator();

console.log('=== Testing std::fn::this with Lambda AST Nodes ===\n');

// ============================================
// Test 1: Lambda with std::this (recursive factorial)
// ============================================
console.log('Test 1: Lambda (AST node) with std::fn::this - Recursive Factorial');

const factorialLambda: Lambda = {
	type: 'Lambda',
	params: ['n'],
	body: {
		type: 'IfExpression',
		condition: {
			type: 'FunctionCall',
			function: 'std::cmp::eq',
			args: [
				{ type: 'Identifier', name: 'n' },
				{ type: 'Literal', value: 0 }
			]
		},
		thenBranch: { type: 'Literal', value: 1 },
		elseBranch: {
			type: 'FunctionCall',
			function: 'std::math::multiply',
			args: [
				{ type: 'Identifier', name: 'n' },
				{
					type: 'FunctionCall',
					function: 'std::fn::this',
					args: [{
						type: 'FunctionCall',
						function: 'std::math::subtract',
						args: [
							{ type: 'Identifier', name: 'n' },
							{ type: 'Literal', value: 1 }
						]
					}]
				}
			]
		}
	} as IfExpression
};

// First, let's see what happens when we evaluate the lambda directly
console.log('Step 1: Evaluate lambda to get FunctionValue');
const lambdaValue = evaluator.run(factorialLambda);
console.log('Lambda type:', (lambdaValue as any).type);
console.log('Lambda definition name:', (lambdaValue as any).definition?.name);

// Now try to call it
console.log('\nStep 2: Try calling the lambda with argument 5');
const callLambda: FunctionCall = {
	type: 'FunctionCall',
	function: factorialLambda,
	args: [{ type: 'Literal', value: 5 }]
};

try {
	const result = evaluator.run(callLambda);
	console.log(`✓ Result: ${result}`);
	console.log('std::fn::this WORKS with Lambda nodes!\n');
} catch (e) {
	console.error(`✗ Error: ${(e as Error).message}`);
	console.log('std::fn::this does NOT work with Lambda nodes\n');
}

// ============================================
// Test 2: Check callStack behavior
// ============================================
console.log('Test 2: Understanding how callStack tracks lambdas');
console.log('When a Lambda is called:');
console.log('- Its FunctionValue.definition.name is "<lambda>"');
console.log('- This name is pushed to callStack');
console.log('- std::fn::this looks up callStack[-1] in functionTable');
console.log('- Problem: "<lambda>" is not in functionTable!\n');

// ============================================
// Test 3: Y-Combinator approach (alternative)
// ============================================
console.log('Test 3: Alternative - Y-Combinator for anonymous recursion');
console.log('For true anonymous recursion, consider:');
console.log('- Y-Combinator pattern');
console.log('- Or binding lambda to a name first');
console.log('- Or passing the function as a parameter\n');

// Example: Bind lambda to a name
console.log('Test 3a: Bind lambda to environment and use by name');

// Register the lambda as a named function
evaluator.registerFunction({
	name: 'myFactorial',
	params: ['n'],
	body: factorialLambda.body
});

const callNamedLambda: FunctionCall = {
	type: 'FunctionCall',
	function: 'myFactorial',
	args: [{ type: 'Literal', value: 5 }]
};

try {
	const result = evaluator.run(callNamedLambda);
	console.log(`✓ Named lambda result: ${result}`);
	console.log('std::fn::this works when lambda is registered with a name!\n');
} catch (e) {
	console.error(`✗ Error: ${(e as Error).message}\n`);
}

// ============================================
// Summary
// ============================================
console.log('=== Summary ===');
console.log('Current std::fn::this implementation:');
console.log('1. Relies on callStack to track function names');
console.log('2. Anonymous lambdas use name "<lambda>"');
console.log('3. "<lambda>" is not in functionTable, causing lookup failures');
console.log('\nResult:');
console.log('- std::fn::this DOES NOT work with truly anonymous Lambda nodes');
console.log('- std::fn::this DOES work with named/registered functions');
console.log('\nSolutions:');
console.log('1. Register lambda before using std::fn::this');
console.log('2. Use Y-combinator for anonymous recursion');
console.log('3. Pass function as parameter (explicit recursion)');

