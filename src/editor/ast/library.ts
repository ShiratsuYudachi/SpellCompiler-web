// =============================================
// Core Library - Predefined Functions
//  - 
// =============================================

import type { Value, FunctionValue, Vector2D } from './ast';
import { isVector2D } from './ast';
import type { Evaluator } from './evaluator';

/**
 * Register all core library functions to an evaluator
 * 
 */
export function registerCoreLibrary(evaluator: Evaluator): void {
	// Arithmetic Operations ()
	registerArithmeticFunctions(evaluator);

	// Comparison Operations ()
	registerComparisonFunctions(evaluator);

	// Logical Operations ()
	registerLogicalFunctions(evaluator);

	// List Operations ()
	registerListFunctions(evaluator);

	// Math Functions ()
	registerMathFunctions(evaluator);

	// String Functions ()
	registerStringFunctions(evaluator);

	// Vector Operations ()
	registerVectorFunctions(evaluator);

	// Functional Programming Utilities ()
	registerFunctionalUtilities(evaluator);
}

// =============================================
// Arithmetic Operations ()
// =============================================

function registerArithmeticFunctions(evaluator: Evaluator): void {
	// add(a, b) - 
	evaluator.registerNativeFunction('add', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`add requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) + (b as number);
	});

	// subtract(a, b) - 
	evaluator.registerNativeFunction('subtract', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`subtract requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) - (b as number);
	});

	// multiply(a, b) - 
	evaluator.registerNativeFunction('multiply', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`multiply requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) * (b as number);
	});

	// divide(a, b) - 
	evaluator.registerNativeFunction('divide', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`divide requires numbers, got ${typeof a} and ${typeof b}`);
		}
		if ((b as number) === 0) {
			throw new Error('Division by zero');
		}
		return (a as number) / (b as number);
	});

	// negate(x) - 
	evaluator.registerNativeFunction('negate', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`negate requires number, got ${typeof x}`);
		}
		return -(x as number);
	});

	// abs(x) - 
	evaluator.registerNativeFunction('abs', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`abs requires number, got ${typeof x}`);
		}
		return Math.abs(x as number);
	});

	// mod(a, b) - 
	evaluator.registerNativeFunction('mod', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`mod requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) % (b as number);
	});
}

// =============================================
// Comparison Operations ()
// =============================================

function registerComparisonFunctions(evaluator: Evaluator): void {
	// gt(a, b) -  (>)
	evaluator.registerNativeFunction('gt', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) > (b as number);
	});

	// lt(a, b) -  (<)
	evaluator.registerNativeFunction('lt', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) < (b as number);
	});

	// gte(a, b) -  (>=)
	evaluator.registerNativeFunction('gte', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) >= (b as number);
	});

	// lte(a, b) -  (<=)
	evaluator.registerNativeFunction('lte', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) <= (b as number);
	});

	// eq(a, b) -  (==)
	evaluator.registerNativeFunction('eq', ['a', 'b'], (a, b) => {
		return a === b;
	});

	// neq(a, b) -  (!=)
	evaluator.registerNativeFunction('neq', ['a', 'b'], (a, b) => {
		return a !== b;
	});
}

// =============================================
// Logical Operations ()
// =============================================

function registerLogicalFunctions(evaluator: Evaluator): void {
	// and(a, b) -  (&&)
	evaluator.registerNativeFunction('and', ['a', 'b'], (a, b) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`and requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) && (b as boolean);
	});

	// or(a, b) -  (||)
	evaluator.registerNativeFunction('or', ['a', 'b'], (a, b) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`or requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) || (b as boolean);
	});

	// not(x) -  (!)
	evaluator.registerNativeFunction('not', ['x'], (x) => {
		if (typeof x !== 'boolean') {
			throw new Error(`not requires boolean, got ${typeof x}`);
		}
		return !(x as boolean);
	});
}

// =============================================
// List Operations ()
// =============================================

function registerListFunctions(evaluator: Evaluator): void {
	// list(...elements) - 
	evaluator.registerNativeFunction('list', [], (...args: Value[]) => {
		return args;
	});

	// cons(head, tail) -  (Lisp)
	evaluator.registerNativeFunction('cons', ['head', 'tail'], (head, tail) => {
		if (!Array.isArray(tail)) {
			throw new Error(`cons requires second argument to be a list, got ${typeof tail}`);
		}
		return [head, ...(tail as Value[])];
	});

	// empty() - 
	evaluator.registerNativeFunction('empty', [], () => {
		return [];
	});

	// append(list, element) - 
	evaluator.registerNativeFunction('append', ['list', 'element'], (list, element) => {
		if (!Array.isArray(list)) {
			throw new Error('First argument to append must be a list');
		}
		return [...(list as Value[]), element];
	});

	// range(start, end) - 
	evaluator.registerNativeFunction('range', ['start', 'end'], (start, end) => {
		if (typeof start !== 'number' || typeof end !== 'number') {
			throw new Error('range requires numbers');
		}
		const result: Value[] = [];
		const s = start as number;
		const e = end as number;
		for (let i = s; i <= e; i++) {
			result.push(i);
		}
		return result;
	});

	// map(fnName, list) - 
	evaluator.registerNativeFunction('map', ['fnName', 'list'], (fnName, list) => {
		if (typeof fnName !== 'string') {
			throw new Error('First argument to map must be function name (string)');
		}
		if (!Array.isArray(list)) {
			throw new Error('Second argument to map must be a list');
		}
		return (list as Value[]).map(item => 
			evaluator.callFunction(fnName as string, item)
		);
	});

	// filter(fnName, list) - 
	evaluator.registerNativeFunction('filter', ['fnName', 'list'], (fnName, list) => {
		if (typeof fnName !== 'string') {
			throw new Error('First argument to filter must be function name (string)');
		}
		if (!Array.isArray(list)) {
			throw new Error('Second argument to filter must be a list');
		}
		return (list as Value[]).filter(item => {
			const result = evaluator.callFunction(fnName as string, item);
			if (typeof result !== 'boolean') {
				throw new Error('Filter function must return boolean');
			}
			return result;
		});
	});

	// reduce(fnName, init, list) - 
	evaluator.registerNativeFunction('reduce', ['fnName', 'init', 'list'], (fnName, init, list) => {
		if (typeof fnName !== 'string') {
			throw new Error('First argument to reduce must be function name (string)');
		}
		if (!Array.isArray(list)) {
			throw new Error('Third argument to reduce must be a list');
		}
		return (list as Value[]).reduce((acc, item) => 
			evaluator.callFunction(fnName as string, acc, item),
			init
		);
	});

	// length(list) - 
	evaluator.registerNativeFunction('length', ['list'], (list) => {
		if (!Array.isArray(list)) {
			throw new Error('length requires a list');
		}
		return (list as Value[]).length;
	});

	// nth(list, index) -  n 
	evaluator.registerNativeFunction('nth', ['list', 'index'], (list, index) => {
		if (!Array.isArray(list)) {
			throw new Error('First argument to nth must be a list');
		}
		if (typeof index !== 'number') {
			throw new Error('Second argument to nth must be a number');
		}
		const idx = index as number;
		const arr = list as Value[];
		if (idx < 0 || idx >= arr.length) {
			throw new Error(`Index ${idx} out of bounds for list of length ${arr.length}`);
		}
		return arr[idx];
	});

	// concat(list1, list2) - 
	evaluator.registerNativeFunction('concat', ['list1', 'list2'], (list1, list2) => {
		if (!Array.isArray(list1) || !Array.isArray(list2)) {
			throw new Error('concat requires two lists');
		}
		return [...(list1 as Value[]), ...(list2 as Value[])];
	});

	// head(list) - 
	evaluator.registerNativeFunction('head', ['list'], (list) => {
		if (!Array.isArray(list)) {
			throw new Error('head requires a list');
		}
		const arr = list as Value[];
		if (arr.length === 0) {
			throw new Error('head called on empty list');
		}
		return arr[0];
	});

	// tail(list) - 
	evaluator.registerNativeFunction('tail', ['list'], (list) => {
		if (!Array.isArray(list)) {
			throw new Error('tail requires a list');
		}
		const arr = list as Value[];
		if (arr.length === 0) {
			throw new Error('tail called on empty list');
		}
		return arr.slice(1);
	});
}

// =============================================
// Math Functions ()
// =============================================

function registerMathFunctions(evaluator: Evaluator): void {
	// power(base, exp) - 
	evaluator.registerNativeFunction('power', ['base', 'exp'], (base, exp) => {
		if (typeof base !== 'number' || typeof exp !== 'number') {
			throw new Error(`power requires numbers, got ${typeof base} and ${typeof exp}`);
		}
		return Math.pow(base as number, exp as number);
	});

	// sqrt(x) - 
	evaluator.registerNativeFunction('sqrt', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`sqrt requires number, got ${typeof x}`);
		}
		return Math.sqrt(x as number);
	});

	// floor(x) - 
	evaluator.registerNativeFunction('floor', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`floor requires number, got ${typeof x}`);
		}
		return Math.floor(x as number);
	});

	// ceil(x) - 
	evaluator.registerNativeFunction('ceil', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`ceil requires number, got ${typeof x}`);
		}
		return Math.ceil(x as number);
	});

	// round(x) - 
	evaluator.registerNativeFunction('round', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`round requires number, got ${typeof x}`);
		}
		return Math.round(x as number);
	});

	// min(a, b) - 
	evaluator.registerNativeFunction('min', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`min requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.min(a as number, b as number);
	});

	// max(a, b) - 
	evaluator.registerNativeFunction('max', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`max requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.max(a as number, b as number);
	});

	// sin(x) - 
	evaluator.registerNativeFunction('sin', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`sin requires number, got ${typeof x}`);
		}
		return Math.sin(x as number);
	});

	// cos(x) - 
	evaluator.registerNativeFunction('cos', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`cos requires number, got ${typeof x}`);
		}
		return Math.cos(x as number);
	});

	// tan(x) - 
	evaluator.registerNativeFunction('tan', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`tan requires number, got ${typeof x}`);
		}
		return Math.tan(x as number);
	});
}

// =============================================
// String Functions ()
// =============================================

function registerStringFunctions(evaluator: Evaluator): void {
	// strConcat(a, b) - 
	evaluator.registerNativeFunction('strConcat', ['a', 'b'], (a, b) => {
		return String(a) + String(b);
	});

	// strLength(s) - 
	evaluator.registerNativeFunction('strLength', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strLength requires string, got ${typeof s}`);
		}
		return (s as string).length;
	});

	// strSubstring(s, start, end) - 
	evaluator.registerNativeFunction('strSubstring', ['s', 'start', 'end'], (s, start, end) => {
		if (typeof s !== 'string') {
			throw new Error(`strSubstring requires string, got ${typeof s}`);
		}
		if (typeof start !== 'number' || typeof end !== 'number') {
			throw new Error('strSubstring start and end must be numbers');
		}
		return (s as string).substring(start as number, end as number);
	});

	// strToUpper(s) - 
	evaluator.registerNativeFunction('strToUpper', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strToUpper requires string, got ${typeof s}`);
		}
		return (s as string).toUpperCase();
	});

	// strToLower(s) - 
	evaluator.registerNativeFunction('strToLower', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strToLower requires string, got ${typeof s}`);
		}
		return (s as string).toLowerCase();
	});
}

// =============================================
// Vector Operations (Vector2D)
// =============================================

function registerVectorFunctions(evaluator: Evaluator): void {
	// vec::create(x, y) - Create a vector
	evaluator.registerNativeFunctionFullName('vec::create', ['x', 'y'], (x, y) => {
		if (typeof x !== 'number' || typeof y !== 'number') {
			throw new Error(`vec::create requires two numbers, got ${typeof x} and ${typeof y}`);
		}
		return {
			type: 'vector2d',
			x: x as number,
			y: y as number
		} as Vector2D;
	});

	// vec::getX(v) - Get X component
	evaluator.registerNativeFunctionFullName('vec::getX', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error(`vec::getX requires a vector, got ${typeof v}`);
		}
		return (v as Vector2D).x;
	});

	// vec::getY(v) - Get Y component
	evaluator.registerNativeFunctionFullName('vec::getY', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error(`vec::getY requires a vector, got ${typeof v}`);
		}
		return (v as Vector2D).y;
	});

	// vec::add(v1, v2) - Add two vectors
	evaluator.registerNativeFunctionFullName('vec::add', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::add requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		return {
			type: 'vector2d',
			x: vec1.x + vec2.x,
			y: vec1.y + vec2.y
		} as Vector2D;
	});

	// vec::subtract(v1, v2) - Subtract two vectors
	evaluator.registerNativeFunctionFullName('vec::subtract', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::subtract requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		return {
			type: 'vector2d',
			x: vec1.x - vec2.x,
			y: vec1.y - vec2.y
		} as Vector2D;
	});

	// vec::multiply(v, scalar) - Multiply vector by scalar
	evaluator.registerNativeFunctionFullName('vec::multiply', ['v', 'scalar'], (v, scalar) => {
		if (!isVector2D(v)) {
			throw new Error('vec::multiply first argument must be a vector');
		}
		if (typeof scalar !== 'number') {
			throw new Error('vec::multiply second argument must be a number');
		}
		const vec = v as Vector2D;
		return {
			type: 'vector2d',
			x: vec.x * (scalar as number),
			y: vec.y * (scalar as number)
		} as Vector2D;
	});

	// vec::divide(v, scalar) - Divide vector by scalar
	evaluator.registerNativeFunctionFullName('vec::divide', ['v', 'scalar'], (v, scalar) => {
		if (!isVector2D(v)) {
			throw new Error('vec::divide first argument must be a vector');
		}
		if (typeof scalar !== 'number') {
			throw new Error('vec::divide second argument must be a number');
		}
		if ((scalar as number) === 0) {
			throw new Error('vec::divide: division by zero');
		}
		const vec = v as Vector2D;
		return {
			type: 'vector2d',
			x: vec.x / (scalar as number),
			y: vec.y / (scalar as number)
		} as Vector2D;
	});

	// vec::length(v) - Get magnitude of vector
	evaluator.registerNativeFunctionFullName('vec::length', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error('vec::length requires a vector');
		}
		const vec = v as Vector2D;
		return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
	});

	// vec::normalize(v) - Normalize vector to unit length
	evaluator.registerNativeFunctionFullName('vec::normalize', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error('vec::normalize requires a vector');
		}
		const vec = v as Vector2D;
		const len = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
		if (len === 0) {
			throw new Error('vec::normalize: cannot normalize zero vector');
		}
		return {
			type: 'vector2d',
			x: vec.x / len,
			y: vec.y / len
		} as Vector2D;
	});

	// vec::dot(v1, v2) - Dot product
	evaluator.registerNativeFunctionFullName('vec::dot', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::dot requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		return vec1.x * vec2.x + vec1.y * vec2.y;
	});

	// vec::distance(v1, v2) - Distance between two vectors
	evaluator.registerNativeFunctionFullName('vec::distance', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::distance requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		const dx = vec2.x - vec1.x;
		const dy = vec2.y - vec1.y;
		return Math.sqrt(dx * dx + dy * dy);
	});

	// vec::angle(v) - Get angle of vector in radians
	evaluator.registerNativeFunctionFullName('vec::angle', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error('vec::angle requires a vector');
		}
		const vec = v as Vector2D;
		return Math.atan2(vec.y, vec.x);
	});

	// vec::rotate(v, angle) - Rotate vector by angle (in radians)
	evaluator.registerNativeFunctionFullName('vec::rotate', ['v', 'angle'], (v, angle) => {
		if (!isVector2D(v)) {
			throw new Error('vec::rotate first argument must be a vector');
		}
		if (typeof angle !== 'number') {
			throw new Error('vec::rotate second argument must be a number (angle in radians)');
		}
		const vec = v as Vector2D;
		const ang = angle as number;
		const cos = Math.cos(ang);
		const sin = Math.sin(ang);
		return {
			type: 'vector2d',
			x: vec.x * cos - vec.y * sin,
			y: vec.x * sin + vec.y * cos
		} as Vector2D;
	});
}

// =============================================
// Functional Programming Utilities ()
// =============================================

function registerFunctionalUtilities(evaluator: Evaluator): void {
	// tap(value, fn) - Execute a side effect and return the original value
	// 
	evaluator.registerNativeFunction('tap', ['value', 'fn'], (value, fn) => {
		// Check if fn is a function
		if (typeof fn !== 'object' || fn === null || (fn as any).type !== 'function') {
			throw new Error('Second argument to tap must be a function');
		}
		
		// Execute the side effect function with the value
		evaluator.callFunctionValue(fn as FunctionValue, value);
		
		// Return the original value unchanged
		return value;
	});

	// print(value) - Print value to console and return it
	// 
	evaluator.registerNativeFunction('print', ['value'], (value) => {
		console.log(value);
		return value;
	});
}

// =============================================
// List all available functions
// =============================================

export const CORE_LIBRARY_FUNCTIONS = [
	// Arithmetic
	'add', 'subtract', 'multiply', 'divide', 'negate', 'abs', 'mod',
	// Comparison
	'gt', 'lt', 'gte', 'lte', 'eq', 'neq',
	// Logical
	'and', 'or', 'not',
	// List Construction
	'list', 'cons', 'empty', 'append', 'range',
	// List Operations
	'map', 'filter', 'reduce', 'length', 'nth', 'concat', 'head', 'tail',
	// Math
	'power', 'sqrt', 'floor', 'ceil', 'round', 'min', 'max', 'sin', 'cos', 'tan',
	// String
	'strConcat', 'strLength', 'strSubstring', 'strToUpper', 'strToLower',
	// Functional Utilities
	'tap', 'print'
] as const;

export type CoreLibraryFunction = typeof CORE_LIBRARY_FUNCTIONS[number];

