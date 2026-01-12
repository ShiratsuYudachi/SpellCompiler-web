// =============================================
// std::this with Lambda Test
//  std::this  Lambda 
// =============================================

import { Evaluator } from './evaluator';
import type { FunctionCall, IfExpression, FunctionDefinition } from './ast';

const evaluator = new Evaluator();

console.log('=== Testing std::fn::this with Lambda ===\n');

// ============================================
// Test 1: Simple recursion with named function
// ============================================
console.log('Test 1: Named function with std::fn::this (Factorial)');
const factorialDef: FunctionDefinition = {
	name: 'factorial',
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

evaluator.registerFunction(factorialDef);

const result1: FunctionCall = {
	type: 'FunctionCall',
	function: 'factorial',
	args: [{ type: 'Literal', value: 5 }]
};

try {
	const value1 = evaluator.run(result1);
	console.log(`factorial(5) = ${value1}`);
	console.log('✓ Named function with std::fn::this works!\n');
} catch (e) {
	console.error('✗ Error:', (e as Error).message, '\n');
}

// ============================================
// Test 2: Lambda with std::this
// ============================================
console.log('Test 2: Lambda with std::fn::this (should it work?)');

// Create a lambda that uses std::fn::this
const lambdaDef: FunctionDefinition = {
	name: 'lambdaFactorial',
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

evaluator.registerFunction(lambdaDef);

const result2: FunctionCall = {
	type: 'FunctionCall',
	function: 'lambdaFactorial',
	args: [{ type: 'Literal', value: 5 }]
};

try {
	const value2 = evaluator.run(result2);
	console.log(`lambdaFactorial(5) = ${value2}`);
	console.log('✓ Lambda (as function definition) with std::fn::this works!\n');
} catch (e) {
	console.error('✗ Error:', (e as Error).message, '\n');
}

// ============================================
// Test 3: Anonymous Lambda (not registered)
// ============================================
console.log('Test 3: Anonymous Lambda with std::fn::this');
console.log('Question: Can an anonymous lambda use std::fn::this?');
console.log('In theory, std::fn::this needs a "current function context"');
console.log('For anonymous lambdas, this might not be well-defined.\n');

// Note: Lambda AST nodes are expressions that create FunctionValues
// They don't have a "name" until they're bound to a variable or passed around
// Using std::fn::this in an anonymous context is ambiguous

console.log('Current behavior:');
console.log('- std::fn::this works for named functions (registered in evaluator)');
console.log('- std::fn::this should work for lambdas IF they have a name context');
console.log('- For truly anonymous lambdas, std::fn::this might be undefined\n');

// ============================================
// Summary
// ============================================
console.log('=== Summary ===');
console.log('std::fn::this is currently implemented to work with:');
console.log('1. ✓ Named functions (via registerFunction)');
console.log('2. ✓ Function definitions (FunctionDefinition with name)');
console.log('3. ? Anonymous lambdas - depends on execution context');
console.log('\nRecommendation:');
console.log('- For recursion in lambdas, consider using Y-combinator');
console.log('- Or ensure lambdas are bound to a name before using std::fn::this');

