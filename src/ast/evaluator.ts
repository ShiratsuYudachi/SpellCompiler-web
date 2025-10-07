// =============================================
// Pure Functional Evaluator
// 纯函数式求值器
// =============================================

import type {
	ASTNode,
	FunctionDefinition,
	Value,
	FunctionValue,
	Literal,
	Identifier,
	FunctionCall,
	IfExpression
} from './ast';
import { registerCoreLibrary } from './library';

// =============================================
// Types
// =============================================

// Environment: maps parameter names to values
type Environment = Map<string, Value>;

// Function Table: maps function names to definitions
type FunctionTable = Map<string, FunctionDefinition>;

// Cache key: functionName + JSON stringified args
type CacheKey = string;

// =============================================
// Evaluator Class
// =============================================

export class Evaluator {
	private functionTable: FunctionTable;
	private cache: Map<CacheKey, Value>;

	constructor() {
		this.functionTable = new Map();
		this.cache = new Map();
		
		// Automatically register core library functions
		registerCoreLibrary(this);
	}

	// ============================================
	// Function Registration
	// ============================================

	/**
	 * Register a user-defined function
	 */
	registerFunction(def: FunctionDefinition): void {
		this.functionTable.set(def.name, def);
	}

	/**
	 * Register a native function (JavaScript implementation)
	 */
	registerNativeFunction(
		name: string,
		params: string[],
		fn: (...args: Value[]) => Value
	): void {
		this.functionTable.set(name, {
			name,
			params,
			body: { type: 'Literal', value: 0, valueType: 'number' } as Literal, // dummy body
			__native: fn as any
		} as any);
	}

	/**
	 * Check if a function exists
	 */
	hasFunction(name: string): boolean {
		return this.functionTable.has(name);
	}

	/**
	 * Get all registered function names
	 */
	getFunctionNames(): string[] {
		return Array.from(this.functionTable.keys());
	}

	// ============================================
	// Cache Management
	// ============================================

	/**
	 * Clear all cached results
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.cache.size,
			keys: Array.from(this.cache.keys())
		};
	}

	// ============================================
	// Core Evaluation
	// ============================================

	/**
	 * Evaluate an AST node in a given environment
	 */
	evaluate(node: ASTNode, env: Environment = new Map()): Value {
		switch (node.type) {
			case 'Literal':
				return this.evalLiteral(node);

			case 'Identifier':
				return this.evalIdentifier(node, env);

			case 'FunctionCall':
				return this.evalFunctionCall(node, env);

			case 'IfExpression':
				return this.evalIfExpression(node, env);

			default:
				throw new Error(`Unknown node type: ${(node as any).type}`);
		}
	}

	// ============================================
	// Node Type Evaluators
	// ============================================

	private evalLiteral(node: Literal): Value {
		return node.value;
	}

	private evalIdentifier(node: Identifier, env: Environment): Value {
		// First, check if it's a parameter in the local environment
		if (env.has(node.name)) {
			return env.get(node.name)!;
		}

		// Then, check if it's a function in the function table
		const fnDef = this.functionTable.get(node.name);
		if (fnDef) {
			// Return the function as a value (first-class function)
			const funcValue: FunctionValue = {
				type: 'function',
				definition: fnDef
			};
			return funcValue;
		}

		// Not found
		throw new Error(`Undefined identifier: ${node.name}`);
	}

	private evalFunctionCall(node: FunctionCall, env: Environment): Value {
		// 1. Get the function definition
		let fnDef: FunctionDefinition;
		let fnName: string;

		if (typeof node.function === 'string') {
			// Syntax sugar: direct function name
			fnName = node.function;
			const def = this.functionTable.get(fnName);
			if (!def) {
				throw new Error(`Function not found: ${fnName}`);
			}
			fnDef = def;
		} else {
			// Evaluate the function expression
			const fnValue = this.evaluate(node.function, env);
			
			// Check if it's a function value
			if (typeof fnValue !== 'object' || fnValue === null || !('type' in fnValue) || fnValue.type !== 'function') {
				throw new Error(`Cannot call non-function: ${JSON.stringify(fnValue)}`);
			}
			
			fnDef = (fnValue as FunctionValue).definition;
			fnName = fnDef.name;
		}

		// 2. Evaluate arguments
		const argValues = node.args.map(arg => this.evaluate(arg, env));

		// 3. Check if native function
		const nativeFn = (fnDef as any).__native;
		if (nativeFn) {
			// Native functions can accept variable arguments
			// If params is empty, it's a variadic function (accepts any number of args)
			if (fnDef.params.length > 0 && argValues.length !== fnDef.params.length) {
				throw new Error(
					`Function ${fnName} expects ${fnDef.params.length} arguments, got ${argValues.length}`
				);
			}
			return nativeFn(...argValues);
		}

		// 4. Check argument count for user-defined functions
		if (argValues.length !== fnDef.params.length) {
			throw new Error(
				`Function ${fnName} expects ${fnDef.params.length} arguments, got ${argValues.length}`
			);
		}

		// 5. Check cache (for user-defined functions)
		const cacheKey = this.makeCacheKey(fnName, argValues);
		if (this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey)!;
		}

		// 6. Create new environment with parameters bound to arguments
		const callEnv = new Map<string, Value>();
		fnDef.params.forEach((param, i) => {
			callEnv.set(param, argValues[i]);
		});

		// 7. Evaluate function body
		const result = this.evaluate(fnDef.body, callEnv);

		// 8. Cache result (pure function optimization)
		this.cache.set(cacheKey, result);

		return result;
	}

	private evalIfExpression(node: IfExpression, env: Environment): Value {
		const condition = this.evaluate(node.condition, env);

		if (typeof condition !== 'boolean') {
			throw new Error(`If condition must be boolean, got ${typeof condition}`);
		}

		// Lazy evaluation: only evaluate the branch we need
		return condition
			? this.evaluate(node.thenBranch, env)
			: this.evaluate(node.elseBranch, env);
	}

	// ============================================
	// Helper Functions
	// ============================================

	private makeCacheKey(fnName: string, args: Value[]): CacheKey {
		return `${fnName}:${JSON.stringify(args)}`;
	}

	// ============================================
	// Public API for running code
	// ============================================

	/**
	 * Run a single expression
	 */
	run(ast: ASTNode): Value {
		return this.evaluate(ast, new Map());
	}

	/**
	 * Call a function by name with arguments
	 */
	callFunction(name: string, ...args: Value[]): Value {
		const fnDef = this.functionTable.get(name);
		if (!fnDef) {
			throw new Error(`Function not found: ${name}`);
		}

		const callNode: FunctionCall = {
			type: 'FunctionCall',
			function: name,  // Use function field instead of functionName
			args: args.map(arg => ({
				type: 'Literal',
				value: arg as any,
				valueType: typeof arg as any
			}))
		};

		return this.evaluate(callNode, new Map());
	}
}
