import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue } from '../ast/ast';

/**
 * Vector2D implemented as Church encoding (closures)
 * 
 * A vector is a function: (selector) => selector(x, y)
 * Access: vector('x') returns x, vector('y') returns y
 * 
 * This is a pure functional implementation without custom Value types
 */

export function registerVectorFunctions(evaluator: Evaluator) {
	
	// vec::create(x: number, y: number) -> Vector2D
	evaluator.registerFunction({
		fullName: 'vec::create',
		params: ['x', 'y'],
		fn: (xVal: Value, yVal: Value): Value => {
			if (typeof xVal !== 'number' || typeof yVal !== 'number') {
				throw new Error('vec::create requires two numbers');
			}
			
			// Return a closure that captures x and y
			const vectorFunc: FunctionValue = {
				type: 'function',
				definition: {
					name: '<vector>',
					params: ['selector'],
					body: { type: 'Literal', value: 0 }, // Placeholder body
					__native: (selector: Value) => {
						if (selector === 'x') return xVal;
						if (selector === 'y') return yVal;
						throw new Error(`Invalid vector selector: ${selector}`);
					}
				}
			};
			
			return vectorFunc;
		},
		ui: { displayName: '📐 create' }
	});

	// vec::x(v: Vector2D) -> number
	evaluator.registerFunction({
		fullName: 'vec::x',
		params: ['v'],
		fn: (v: Value): Value => {
			if (typeof v !== 'object' || !v || v.type !== 'function') {
				throw new Error('vec::x requires a Vector2D');
			}
			return evaluator.callFunctionValue(v as FunctionValue, 'x');
		},
		ui: { displayName: '📐 x' }
	});

	// vec::y(v: Vector2D) -> number
	evaluator.registerFunction({
		fullName: 'vec::y',
		params: ['v'],
		fn: (v: Value): Value => {
			if (typeof v !== 'object' || !v || v.type !== 'function') {
				throw new Error('vec::y requires a Vector2D');
			}
			return evaluator.callFunctionValue(v as FunctionValue, 'y');
		},
		ui: { displayName: '📐 y' }
	});

	// vec::add(v1: Vector2D, v2: Vector2D) -> Vector2D
	evaluator.registerFunction({
		fullName: 'vec::add',
		params: ['v1', 'v2'],
		fn: (v1: Value, v2: Value): Value => {
			const x1 = evaluator.callFunctionValue(v1 as FunctionValue, 'x') as number;
			const y1 = evaluator.callFunctionValue(v1 as FunctionValue, 'y') as number;
			const x2 = evaluator.callFunctionValue(v2 as FunctionValue, 'x') as number;
			const y2 = evaluator.callFunctionValue(v2 as FunctionValue, 'y') as number;
			
			return evaluator.callFunction('vec::create', x1 + x2, y1 + y2);
		},
		ui: { displayName: '📐 add' }
	});

	// vec::subtract(v1: Vector2D, v2: Vector2D) -> Vector2D
	evaluator.registerFunction({
		fullName: 'vec::subtract',
		params: ['v1', 'v2'],
		fn: (v1: Value, v2: Value): Value => {
			const x1 = evaluator.callFunctionValue(v1 as FunctionValue, 'x') as number;
			const y1 = evaluator.callFunctionValue(v1 as FunctionValue, 'y') as number;
			const x2 = evaluator.callFunctionValue(v2 as FunctionValue, 'x') as number;
			const y2 = evaluator.callFunctionValue(v2 as FunctionValue, 'y') as number;
			
			return evaluator.callFunction('vec::create', x1 - x2, y1 - y2);
		},
		ui: { displayName: '📐 subtract' }
	});

	// vec::scale(v: Vector2D, s: number) -> Vector2D
	evaluator.registerFunction({
		fullName: 'vec::scale',
		params: ['v', 's'],
		fn: (v: Value, s: Value): Value => {
			if (typeof s !== 'number') {
				throw new Error('vec::scale scalar must be a number');
			}
			
			const x = evaluator.callFunctionValue(v as FunctionValue, 'x') as number;
			const y = evaluator.callFunctionValue(v as FunctionValue, 'y') as number;
			
			return evaluator.callFunction('vec::create', x * s, y * s);
		},
		ui: { displayName: '📐 scale' }
	});

	// vec::dot(v1: Vector2D, v2: Vector2D) -> number
	evaluator.registerFunction({
		fullName: 'vec::dot',
		params: ['v1', 'v2'],
		fn: (v1: Value, v2: Value): Value => {
			const x1 = evaluator.callFunctionValue(v1 as FunctionValue, 'x') as number;
			const y1 = evaluator.callFunctionValue(v1 as FunctionValue, 'y') as number;
			const x2 = evaluator.callFunctionValue(v2 as FunctionValue, 'x') as number;
			const y2 = evaluator.callFunctionValue(v2 as FunctionValue, 'y') as number;
			
			return x1 * x2 + y1 * y2;
		},
		ui: { displayName: '📐 dot' }
	});

	// vec::length(v: Vector2D) -> number
	evaluator.registerFunction({
		fullName: 'vec::length',
		params: ['v'],
		fn: (v: Value): Value => {
			const x = evaluator.callFunctionValue(v as FunctionValue, 'x') as number;
			const y = evaluator.callFunctionValue(v as FunctionValue, 'y') as number;
			
			return Math.sqrt(x * x + y * y);
		},
		ui: { displayName: '📐 length' }
	});

	// vec::normalize(v: Vector2D) -> Vector2D
	evaluator.registerFunction({
		fullName: 'vec::normalize',
		params: ['v'],
		fn: (v: Value): Value => {
			const x = evaluator.callFunctionValue(v as FunctionValue, 'x') as number;
			const y = evaluator.callFunctionValue(v as FunctionValue, 'y') as number;
			
			const length = Math.sqrt(x * x + y * y);
			
			if (length === 0) {
				return evaluator.callFunction('vec::create', 0, 0);
			}
			
			return evaluator.callFunction('vec::create', x / length, y / length);
		},
		ui: { displayName: '📐 normalize' }
	});

	// vec::distance(v1: Vector2D, v2: Vector2D) -> number
	evaluator.registerFunction({
		fullName: 'vec::distance',
		params: ['v1', 'v2'],
		fn: (v1: Value, v2: Value): Value => {
			const x1 = evaluator.callFunctionValue(v1 as FunctionValue, 'x') as number;
			const y1 = evaluator.callFunctionValue(v1 as FunctionValue, 'y') as number;
			const x2 = evaluator.callFunctionValue(v2 as FunctionValue, 'x') as number;
			const y2 = evaluator.callFunctionValue(v2 as FunctionValue, 'y') as number;
			
			const dx = x2 - x1;
			const dy = y2 - y1;
			
			return Math.sqrt(dx * dx + dy * dy);
		},
		ui: { displayName: '📐 distance' }
	});
}
