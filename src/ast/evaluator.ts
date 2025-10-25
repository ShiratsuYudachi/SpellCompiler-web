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
	IfExpression,
	Lambda
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
	private callStack: string[]; // Track current function call stack
	private callStackValues: FunctionValue[]; // Track actual function values for lambdas

	constructor() {
		this.functionTable = new Map();
		this.cache = new Map();
		this.callStack = [];
		this.callStackValues = [];

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
	 * Automatically adds 'std::' prefix to prevent naming conflicts
	 */
	registerNativeFunction(
		name: string,
		params: string[],
		fn: (...args: Value[]) => Value
	): void {
		const namespacedName = `std::${name}`;
		this.functionTable.set(namespacedName, {
			name: namespacedName,
			params,
			body: { type: 'Literal', value: 0 } as Literal, // dummy body
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
				return this.evalLiteral(node, env);

			case 'Identifier':
				return this.evalIdentifier(node, env);

			case 'FunctionCall':
				return this.evalFunctionCall(node, env);

			case 'IfExpression':
				return this.evalIfExpression(node, env);

			case 'Lambda':
				return this.evalLambda(node, env);

			default:
				throw new Error(`Unknown node type: ${(node as any).type}`);
		}
	}

	// ============================================
	// Node Type Evaluators
	// ============================================

	private evalLiteral(_node: Literal, _env: Environment): Value {
		// Literal only contains simple values (number, boolean, string)
		// Functions are represented by Lambda nodes
		return _node.value;
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
			// Capture the current environment for closure support
			const funcValue: FunctionValue = {
				type: 'function',
				definition: fnDef,
				capturedEnv: new Map(env)
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
		let fnValue: FunctionValue | undefined;

		if (typeof node.function === 'string') {
			// Syntax sugar: direct function name
			fnName = node.function;

			// Special handling for std::this - recursive call
			if (fnName === 'std::this') {
				if (this.callStack.length === 0) {
					throw new Error('std::this can only be used inside a function');
				}
				// Get the current function from call stack
				const currentFnName = this.callStack[this.callStack.length - 1];
				
				// If it's a lambda (name is "<lambda>"), use the FunctionValue from callStackValues
				if (currentFnName === '<lambda>' && this.callStackValues.length > 0) {
					fnValue = this.callStackValues[this.callStackValues.length - 1];
					fnDef = fnValue.definition;
					fnName = currentFnName;
				} else {
					// Regular named function, look it up
					fnName = currentFnName;
					const def = this.functionTable.get(fnName);
					if (!def) {
						throw new Error(`Function not found: ${fnName}`);
					}
					fnDef = def;
				}
			} else {
				const def = this.functionTable.get(fnName);
				if (!def) {
					throw new Error(`Function not found: ${fnName}`);
				}
				fnDef = def;
			}
		} else {
			// Evaluate the function expression
			const evaluatedFn = this.evaluate(node.function, env);

			// Check if it's a function value
			if (typeof evaluatedFn !== 'object' || evaluatedFn === null || !('type' in evaluatedFn) || evaluatedFn.type !== 'function') {
				throw new Error(`Cannot call non-function: ${JSON.stringify(evaluatedFn)}`);
			}

			fnValue = evaluatedFn as FunctionValue;
			fnDef = fnValue.definition;
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
		// Don't cache lambda functions (they're anonymous and may have different bodies)
		const shouldCache = fnName !== '<lambda>';
		const cacheKey = shouldCache ? this.makeCacheKey(fnName, argValues) : '';
		if (shouldCache && this.cache.has(cacheKey)) {
			return this.cache.get(cacheKey)!;
		}

		// 6. Create new environment with parameters bound to arguments
		// Start with captured environment (for closure support), then add parameters
		const callEnv = new Map<string, Value>(
			fnValue?.capturedEnv || new Map()
		);
		fnDef.params.forEach((param, i) => {
			callEnv.set(param, argValues[i]);
		});

		// 7. Push current function to call stack
		this.callStack.push(fnName);
		// If it's a lambda (has fnValue), also push to callStackValues
		if (fnValue && fnName === '<lambda>') {
			this.callStackValues.push(fnValue);
		}

		try {
			// 8. Evaluate function body
			const result = this.evaluate(fnDef.body, callEnv);

			// 9. Cache result (pure function optimization)
			if (shouldCache) {
				this.cache.set(cacheKey, result);
			}

			return result;
		} finally {
			// 10. Always pop the call stack, even if evaluation throws
			this.callStack.pop();
			if (fnValue && fnName === '<lambda>') {
				this.callStackValues.pop();
			}
		}
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

	private evalLambda(node: Lambda, env: Environment): FunctionValue {
		// Lambda creates a closure by capturing the current environment
		return {
			type: 'function',
			definition: {
				name: '<lambda>',  // Anonymous function
				params: node.params,
				body: node.body
			},
			capturedEnv: new Map(env)  // Capture environment for closure
		};
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

		// Check if it's a native function
		if ((fnDef as any).__native) {
			return (fnDef as any).__native(...args);
		}

		// Build environment directly with the provided values
		const env = new Map<string, Value>();
		fnDef.params.forEach((param, index) => {
			env.set(param, args[index]);
		});

		// Evaluate the function body
		this.callStack.push(name);
		try {
			return this.evaluate(fnDef.body, env);
		} finally {
			this.callStack.pop();
		}
	}

	/**
	 * Call a FunctionValue with arguments
	 * This allows native functions to invoke user-defined or lambda functions
	 */
	callFunctionValue(fnValue: FunctionValue, ...args: Value[]): Value {
		const fnDef = fnValue.definition;

		// Check argument count
		if (args.length !== fnDef.params.length) {
			throw new Error(
				`Function expects ${fnDef.params.length} arguments, got ${args.length}`
			);
		}

		// Check if it's a native function
		if ((fnDef as any).__native) {
			return (fnDef as any).__native(...args);
		}

		// Create environment: start with captured environment, then add parameters
		const callEnv = new Map<string, Value>(fnValue.capturedEnv || new Map());
		fnDef.params.forEach((param, i) => {
			callEnv.set(param, args[i]);
		});

		// Push to call stack
		const fnName = fnDef.name;
		this.callStack.push(fnName);
		if (fnName === '<lambda>') {
			this.callStackValues.push(fnValue);
		}

		try {
			return this.evaluate(fnDef.body, callEnv);
		} finally {
			this.callStack.pop();
			if (fnName === '<lambda>') {
				this.callStackValues.pop();
			}
		}
	}
}
