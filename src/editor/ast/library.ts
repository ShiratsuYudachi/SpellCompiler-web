// =============================================
// Core Library - Predefined Functions
//  - 
// =============================================

import type { Value, FunctionValue, Vector2D } from './ast';
import { isVector2D } from './ast';
import type { Evaluator } from './evaluator';

function registerNative(
	evaluator: Evaluator,
	fullName: string,
	params: string[],
	fn: (...args: Value[]) => Value,
	ui?: { displayName?: string; description?: string; hidden?: boolean },
	parameterModes?: Record<string, any>,
) {
	evaluator.registerFunction({
		fullName,
		params,
		fn,
		ui,
		parameterModes,
	})
}

function registerAlias(
	evaluator: Evaluator,
	aliasFullName: string,
	targetDisplayName: string,
	params: string[],
	fn: (...args: Value[]) => Value,
) {
	registerNative(evaluator, aliasFullName, params, fn, { displayName: targetDisplayName, hidden: true })
}

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
	const addImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`add requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) + (b as number);
	}
	registerNative(evaluator, 'std::math::add', ['a', 'b'], addImpl, { displayName: 'add' })
	registerAlias(evaluator, 'std::add', 'add', ['a', 'b'], addImpl)

	// subtract(a, b) - 
	const subtractImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`subtract requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) - (b as number);
	}
	registerNative(evaluator, 'std::math::subtract', ['a', 'b'], subtractImpl, { displayName: 'subtract' })
	registerAlias(evaluator, 'std::subtract', 'subtract', ['a', 'b'], subtractImpl)

	// multiply(a, b) - 
	const multiplyImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`multiply requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) * (b as number);
	}
	registerNative(evaluator, 'std::math::multiply', ['a', 'b'], multiplyImpl, { displayName: 'multiply' })
	registerAlias(evaluator, 'std::multiply', 'multiply', ['a', 'b'], multiplyImpl)

	// divide(a, b) - 
	const divideImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`divide requires numbers, got ${typeof a} and ${typeof b}`);
		}
		if ((b as number) === 0) {
			throw new Error('Division by zero');
		}
		return (a as number) / (b as number);
	}
	registerNative(evaluator, 'std::math::divide', ['a', 'b'], divideImpl, { displayName: 'divide' })
	registerAlias(evaluator, 'std::divide', 'divide', ['a', 'b'], divideImpl)

	// negate(x) - 
	const negateImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`negate requires number, got ${typeof x}`);
		}
		return -(x as number);
	}
	registerNative(evaluator, 'std::math::negate', ['x'], negateImpl, { displayName: 'negate' })
	registerAlias(evaluator, 'std::negate', 'negate', ['x'], negateImpl)

	// abs(x) - 
	const absImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`abs requires number, got ${typeof x}`);
		}
		return Math.abs(x as number);
	}
	registerNative(evaluator, 'std::math::abs', ['x'], absImpl, { displayName: 'abs' })
	registerAlias(evaluator, 'std::abs', 'abs', ['x'], absImpl)

	// mod(a, b) - 
	const modImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`mod requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) % (b as number);
	}
	registerNative(evaluator, 'std::math::mod', ['a', 'b'], modImpl, { displayName: 'mod' })
	registerAlias(evaluator, 'std::mod', 'mod', ['a', 'b'], modImpl)
}

// =============================================
// Comparison Operations ()
// =============================================

function registerComparisonFunctions(evaluator: Evaluator): void {
	// gt(a, b) -  (>)
	const gtImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) > (b as number);
	}
	registerNative(evaluator, 'std::cmp::gt', ['a', 'b'], gtImpl, { displayName: 'gt' })
	registerAlias(evaluator, 'std::gt', 'gt', ['a', 'b'], gtImpl)

	// lt(a, b) -  (<)
	const ltImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) < (b as number);
	}
	registerNative(evaluator, 'std::cmp::lt', ['a', 'b'], ltImpl, { displayName: 'lt' })
	registerAlias(evaluator, 'std::lt', 'lt', ['a', 'b'], ltImpl)

	// gte(a, b) -  (>=)
	const gteImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) >= (b as number);
	}
	registerNative(evaluator, 'std::cmp::gte', ['a', 'b'], gteImpl, { displayName: 'gte' })
	registerAlias(evaluator, 'std::gte', 'gte', ['a', 'b'], gteImpl)

	// lte(a, b) -  (<=)
	const lteImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) <= (b as number);
	}
	registerNative(evaluator, 'std::cmp::lte', ['a', 'b'], lteImpl, { displayName: 'lte' })
	registerAlias(evaluator, 'std::lte', 'lte', ['a', 'b'], lteImpl)

	// eq(a, b) -  (==)
	const eqImpl = (a: Value, b: Value) => a === b
	registerNative(evaluator, 'std::cmp::eq', ['a', 'b'], eqImpl, { displayName: 'eq' })
	registerAlias(evaluator, 'std::eq', 'eq', ['a', 'b'], eqImpl)

	// neq(a, b) -  (!=)
	const neqImpl = (a: Value, b: Value) => a !== b
	registerNative(evaluator, 'std::cmp::neq', ['a', 'b'], neqImpl, { displayName: 'neq' })
	registerAlias(evaluator, 'std::neq', 'neq', ['a', 'b'], neqImpl)
}

// =============================================
// Logical Operations ()
// =============================================

function registerLogicalFunctions(evaluator: Evaluator): void {
	// and(a, b) -  (&&)
	const andImpl = (a: Value, b: Value) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`and requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) && (b as boolean);
	}
	registerNative(evaluator, 'std::logic::and', ['a', 'b'], andImpl, { displayName: 'and' })
	registerAlias(evaluator, 'std::and', 'and', ['a', 'b'], andImpl)

	// or(a, b) -  (||)
	const orImpl = (a: Value, b: Value) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`or requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) || (b as boolean);
	}
	registerNative(evaluator, 'std::logic::or', ['a', 'b'], orImpl, { displayName: 'or' })
	registerAlias(evaluator, 'std::or', 'or', ['a', 'b'], orImpl)

	// not(x) -  (!)
	const notImpl = (x: Value) => {
		if (typeof x !== 'boolean') {
			throw new Error(`not requires boolean, got ${typeof x}`);
		}
		return !(x as boolean);
	}
	registerNative(evaluator, 'std::logic::not', ['x'], notImpl, { displayName: 'not' })
	registerAlias(evaluator, 'std::not', 'not', ['x'], notImpl)
}

// =============================================
// List Operations ()
// =============================================

function registerListFunctions(evaluator: Evaluator): void {
	// list(...elements) - 
	const listImpl = (...args: Value[]) => args
	registerNative(evaluator, 'std::list::list', [], listImpl, { displayName: 'list' })
	registerAlias(evaluator, 'std::list', 'list', [], listImpl)

	// cons(head, tail) -  (Lisp)
	const consImpl = (head: Value, tail: Value) => {
		if (!Array.isArray(tail)) {
			throw new Error(`cons requires second argument to be a list, got ${typeof tail}`);
		}
		return [head, ...(tail as Value[])];
	}
	registerNative(evaluator, 'std::list::cons', ['head', 'tail'], consImpl, { displayName: 'cons' })
	registerAlias(evaluator, 'std::cons', 'cons', ['head', 'tail'], consImpl)

	// empty() - 
	const emptyImpl = () => []
	registerNative(evaluator, 'std::list::empty', [], emptyImpl, { displayName: 'empty' })
	registerAlias(evaluator, 'std::empty', 'empty', [], emptyImpl)

	// append(list, element) - 
	const appendImpl = (list: Value, element: Value) => {
		if (!Array.isArray(list)) {
			throw new Error('First argument to append must be a list');
		}
		return [...(list as Value[]), element];
	}
	registerNative(evaluator, 'std::list::append', ['list', 'element'], appendImpl, { displayName: 'append' })
	registerAlias(evaluator, 'std::append', 'append', ['list', 'element'], appendImpl)

	// range(start, end) - 
	const rangeImpl = (start: Value, end: Value) => {
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
	}
	registerNative(evaluator, 'std::list::range', ['start', 'end'], rangeImpl, { displayName: 'range' })
	registerAlias(evaluator, 'std::range', 'range', ['start', 'end'], rangeImpl)

	// map(fnName, list) - 
	const mapImpl = (fnName: Value, list: Value) => {
		if (typeof fnName !== 'string') {
			throw new Error('First argument to map must be function name (string)');
		}
		if (!Array.isArray(list)) {
			throw new Error('Second argument to map must be a list');
		}
		return (list as Value[]).map(item => 
			evaluator.callFunction(fnName as string, item)
		);
	}
	registerNative(evaluator, 'std::list::map', ['fnName', 'list'], mapImpl, { displayName: 'map' })
	registerAlias(evaluator, 'std::map', 'map', ['fnName', 'list'], mapImpl)

	// filter(fnName, list) - 
	const filterImpl = (fnName: Value, list: Value) => {
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
	}
	registerNative(evaluator, 'std::list::filter', ['fnName', 'list'], filterImpl, { displayName: 'filter' })
	registerAlias(evaluator, 'std::filter', 'filter', ['fnName', 'list'], filterImpl)

	// reduce(fnName, init, list) - 
	const reduceImpl = (fnName: Value, init: Value, list: Value) => {
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
	}
	registerNative(evaluator, 'std::list::reduce', ['fnName', 'init', 'list'], reduceImpl, { displayName: 'reduce' })
	registerAlias(evaluator, 'std::reduce', 'reduce', ['fnName', 'init', 'list'], reduceImpl)

	// length(list) - 
	const lengthImpl = (list: Value) => {
		if (!Array.isArray(list)) {
			throw new Error('length requires a list');
		}
		return (list as Value[]).length;
	}
	registerNative(evaluator, 'std::list::length', ['list'], lengthImpl, { displayName: 'length' })
	registerAlias(evaluator, 'std::length', 'length', ['list'], lengthImpl)

	// nth(list, index) -  n 
	const nthImpl = (list: Value, index: Value) => {
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
	}
	registerNative(evaluator, 'std::list::nth', ['list', 'index'], nthImpl, { displayName: 'nth' })
	registerAlias(evaluator, 'std::nth', 'nth', ['list', 'index'], nthImpl)

	// concat(list1, list2) - 
	const concatImpl = (list1: Value, list2: Value) => {
		if (!Array.isArray(list1) || !Array.isArray(list2)) {
			throw new Error('concat requires two lists');
		}
		return [...(list1 as Value[]), ...(list2 as Value[])];
	}
	registerNative(evaluator, 'std::list::concat', ['list1', 'list2'], concatImpl, { displayName: 'concat' })
	registerAlias(evaluator, 'std::concat', 'concat', ['list1', 'list2'], concatImpl)

	// head(list) - 
	const headImpl = (list: Value) => {
		if (!Array.isArray(list)) {
			throw new Error('head requires a list');
		}
		const arr = list as Value[];
		if (arr.length === 0) {
			throw new Error('head called on empty list');
		}
		return arr[0];
	}
	registerNative(evaluator, 'std::list::head', ['list'], headImpl, { displayName: 'head' })
	registerAlias(evaluator, 'std::head', 'head', ['list'], headImpl)

	// tail(list) - 
	const tailImpl = (list: Value) => {
		if (!Array.isArray(list)) {
			throw new Error('tail requires a list');
		}
		const arr = list as Value[];
		if (arr.length === 0) {
			throw new Error('tail called on empty list');
		}
		return arr.slice(1);
	}
	registerNative(evaluator, 'std::list::tail', ['list'], tailImpl, { displayName: 'tail' })
	registerAlias(evaluator, 'std::tail', 'tail', ['list'], tailImpl)
}

// =============================================
// Math Functions ()
// =============================================

function registerMathFunctions(evaluator: Evaluator): void {
	// power(base, exp) - 
	const powerImpl = (base: Value, exp: Value) => {
		if (typeof base !== 'number' || typeof exp !== 'number') {
			throw new Error(`power requires numbers, got ${typeof base} and ${typeof exp}`);
		}
		return Math.pow(base as number, exp as number);
	}
	registerNative(evaluator, 'std::math::power', ['base', 'exp'], powerImpl, { displayName: 'power' })
	registerAlias(evaluator, 'std::power', 'power', ['base', 'exp'], powerImpl)

	// sqrt(x) - 
	const sqrtImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`sqrt requires number, got ${typeof x}`);
		}
		return Math.sqrt(x as number);
	}
	registerNative(evaluator, 'std::math::sqrt', ['x'], sqrtImpl, { displayName: 'sqrt' })
	registerAlias(evaluator, 'std::sqrt', 'sqrt', ['x'], sqrtImpl)

	// floor(x) - 
	const floorImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`floor requires number, got ${typeof x}`);
		}
		return Math.floor(x as number);
	}
	registerNative(evaluator, 'std::math::floor', ['x'], floorImpl, { displayName: 'floor' })
	registerAlias(evaluator, 'std::floor', 'floor', ['x'], floorImpl)

	// ceil(x) - 
	const ceilImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`ceil requires number, got ${typeof x}`);
		}
		return Math.ceil(x as number);
	}
	registerNative(evaluator, 'std::math::ceil', ['x'], ceilImpl, { displayName: 'ceil' })
	registerAlias(evaluator, 'std::ceil', 'ceil', ['x'], ceilImpl)

	// round(x) - 
	const roundImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`round requires number, got ${typeof x}`);
		}
		return Math.round(x as number);
	}
	registerNative(evaluator, 'std::math::round', ['x'], roundImpl, { displayName: 'round' })
	registerAlias(evaluator, 'std::round', 'round', ['x'], roundImpl)

	// min(a, b) - 
	const minImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`min requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.min(a as number, b as number);
	}
	registerNative(evaluator, 'std::math::min', ['a', 'b'], minImpl, { displayName: 'min' })
	registerAlias(evaluator, 'std::min', 'min', ['a', 'b'], minImpl)

	// max(a, b) - 
	const maxImpl = (a: Value, b: Value) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`max requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.max(a as number, b as number);
	}
	registerNative(evaluator, 'std::math::max', ['a', 'b'], maxImpl, { displayName: 'max' })
	registerAlias(evaluator, 'std::max', 'max', ['a', 'b'], maxImpl)

	// sin(x) - 
	const sinImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`sin requires number, got ${typeof x}`);
		}
		return Math.sin(x as number);
	}
	registerNative(evaluator, 'std::math::sin', ['x'], sinImpl, { displayName: 'sin' })
	registerAlias(evaluator, 'std::sin', 'sin', ['x'], sinImpl)

	// cos(x) - 
	const cosImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`cos requires number, got ${typeof x}`);
		}
		return Math.cos(x as number);
	}
	registerNative(evaluator, 'std::math::cos', ['x'], cosImpl, { displayName: 'cos' })
	registerAlias(evaluator, 'std::cos', 'cos', ['x'], cosImpl)

	// tan(x) - 
	const tanImpl = (x: Value) => {
		if (typeof x !== 'number') {
			throw new Error(`tan requires number, got ${typeof x}`);
		}
		return Math.tan(x as number);
	}
	registerNative(evaluator, 'std::math::tan', ['x'], tanImpl, { displayName: 'tan' })
	registerAlias(evaluator, 'std::tan', 'tan', ['x'], tanImpl)
}

// =============================================
// String Functions ()
// =============================================

function registerStringFunctions(evaluator: Evaluator): void {
	// strConcat(a, b) - 
	const concatImpl = (a: Value, b: Value) => String(a) + String(b)
	registerNative(evaluator, 'std::str::concat', ['a', 'b'], concatImpl, { displayName: 'concat' })
	registerAlias(evaluator, 'std::strConcat', 'concat', ['a', 'b'], concatImpl)

	// strLength(s) - 
	const strLengthImpl = (s: Value) => {
		if (typeof s !== 'string') {
			throw new Error(`strLength requires string, got ${typeof s}`);
		}
		return (s as string).length;
	}
	registerNative(evaluator, 'std::str::length', ['s'], strLengthImpl, { displayName: 'length' })
	registerAlias(evaluator, 'std::strLength', 'length', ['s'], strLengthImpl)

	// strSubstring(s, start, end) - 
	const substringImpl = (s: Value, start: Value, end: Value) => {
		if (typeof s !== 'string') {
			throw new Error(`strSubstring requires string, got ${typeof s}`);
		}
		if (typeof start !== 'number' || typeof end !== 'number') {
			throw new Error('strSubstring start and end must be numbers');
		}
		return (s as string).substring(start as number, end as number);
	}
	registerNative(evaluator, 'std::str::substring', ['s', 'start', 'end'], substringImpl, { displayName: 'substring' })
	registerAlias(evaluator, 'std::strSubstring', 'substring', ['s', 'start', 'end'], substringImpl)

	// strToUpper(s) - 
	const toUpperImpl = (s: Value) => {
		if (typeof s !== 'string') {
			throw new Error(`strToUpper requires string, got ${typeof s}`);
		}
		return (s as string).toUpperCase();
	}
	registerNative(evaluator, 'std::str::toUpper', ['s'], toUpperImpl, { displayName: 'toUpper' })
	registerAlias(evaluator, 'std::strToUpper', 'toUpper', ['s'], toUpperImpl)

	// strToLower(s) - 
	const toLowerImpl = (s: Value) => {
		if (typeof s !== 'string') {
			throw new Error(`strToLower requires string, got ${typeof s}`);
		}
		return (s as string).toLowerCase();
	}
	registerNative(evaluator, 'std::str::toLower', ['s'], toLowerImpl, { displayName: 'toLower' })
	registerAlias(evaluator, 'std::strToLower', 'toLower', ['s'], toLowerImpl)
}

// =============================================
// Vector Operations (Vector2D)
// =============================================

function registerVectorFunctions(evaluator: Evaluator): void {
	// vec::create(x, y) - Create a vector
	registerNative(evaluator, 'vec::create', ['x', 'y'], (x, y) => {
		if (typeof x !== 'number' || typeof y !== 'number') {
			throw new Error(`vec::create requires two numbers, got ${typeof x} and ${typeof y}`);
		}
		return {
			type: 'vector2d',
			x: x as number,
			y: y as number
		} as Vector2D;
	}, { displayName: 'create' });

	// vec::getX(v) - Get X component
	registerNative(evaluator, 'vec::getX', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error(`vec::getX requires a vector, got ${typeof v}`);
		}
		return (v as Vector2D).x;
	}, { displayName: 'getX' });

	// vec::getY(v) - Get Y component
	registerNative(evaluator, 'vec::getY', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error(`vec::getY requires a vector, got ${typeof v}`);
		}
		return (v as Vector2D).y;
	}, { displayName: 'getY' });

	// vec::add(v1, v2) - Add two vectors
	registerNative(evaluator, 'vec::add', ['v1', 'v2'], (v1, v2) => {
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
	}, { displayName: 'add' });

	// vec::subtract(v1, v2) - Subtract two vectors
	registerNative(evaluator, 'vec::subtract', ['v1', 'v2'], (v1, v2) => {
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
	}, { displayName: 'subtract' });

	// vec::multiply(v, scalar) - Multiply vector by scalar
	registerNative(evaluator, 'vec::multiply', ['v', 'scalar'], (v, scalar) => {
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
	}, { displayName: 'multiply' });

	// vec::divide(v, scalar) - Divide vector by scalar
	registerNative(evaluator, 'vec::divide', ['v', 'scalar'], (v, scalar) => {
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
	}, { displayName: 'divide' });

	// vec::length(v) - Get magnitude of vector
	registerNative(evaluator, 'vec::length', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error('vec::length requires a vector');
		}
		const vec = v as Vector2D;
		return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
	}, { displayName: 'length' });

	// vec::normalize(v) - Normalize vector to unit length
	registerNative(evaluator, 'vec::normalize', ['v'], (v) => {
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
	}, { displayName: 'normalize' });

	// vec::dot(v1, v2) - Dot product
	registerNative(evaluator, 'vec::dot', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::dot requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		return vec1.x * vec2.x + vec1.y * vec2.y;
	}, { displayName: 'dot' });

	// vec::distance(v1, v2) - Distance between two vectors
	registerNative(evaluator, 'vec::distance', ['v1', 'v2'], (v1, v2) => {
		if (!isVector2D(v1) || !isVector2D(v2)) {
			throw new Error('vec::distance requires two vectors');
		}
		const vec1 = v1 as Vector2D;
		const vec2 = v2 as Vector2D;
		const dx = vec2.x - vec1.x;
		const dy = vec2.y - vec1.y;
		return Math.sqrt(dx * dx + dy * dy);
	}, { displayName: 'distance' });

	// vec::angle(v) - Get angle of vector in radians
	registerNative(evaluator, 'vec::angle', ['v'], (v) => {
		if (!isVector2D(v)) {
			throw new Error('vec::angle requires a vector');
		}
		const vec = v as Vector2D;
		return Math.atan2(vec.y, vec.x);
	}, { displayName: 'angle' });

	// vec::rotate(v, angle) - Rotate vector by angle (in radians)
	registerNative(evaluator, 'vec::rotate', ['v', 'angle'], (v, angle) => {
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
	}, { displayName: 'rotate' });
}

// =============================================
// Functional Programming Utilities ()
// =============================================

function registerFunctionalUtilities(evaluator: Evaluator): void {
	const thisImpl = () => {
		throw new Error('std::this can only be used inside a function')
	}
	registerNative(evaluator, 'std::fn::this', [], thisImpl, { displayName: 'this' })
	registerAlias(evaluator, 'std::this', 'this', [], thisImpl)

	// tap(value, fn) - Execute a side effect and return the original value
	// 
	const tapImpl = (value: Value, fn: Value) => {
		// Check if fn is a function
		if (typeof fn !== 'object' || fn === null || (fn as any).type !== 'function') {
			throw new Error('Second argument to tap must be a function');
		}
		
		// Execute the side effect function with the value
		evaluator.callFunctionValue(fn as FunctionValue, value);
		
		// Return the original value unchanged
		return value;
	}
	registerNative(evaluator, 'std::fn::tap', ['value', 'fn'], tapImpl, { displayName: 'tap' })
	registerAlias(evaluator, 'std::tap', 'tap', ['value', 'fn'], tapImpl)

	// print(value) - Print value to console and return it
	// 
	const printImpl = (value: Value) => {
		console.log(value);
		return value;
	}
	registerNative(evaluator, 'std::fn::print', ['value'], printImpl, { displayName: 'print' })
	registerAlias(evaluator, 'std::print', 'print', ['value'], printImpl)

	const debugImpl = (label: Value, value: Value) => {
		console.log(`[DEBUG] ${String(label)}`, value)
		return value
	}
	registerNative(evaluator, 'std::fn::debug', ['label', 'value'], debugImpl, { displayName: 'debug' })
	registerAlias(evaluator, 'std::debug', 'debug', ['label', 'value'], debugImpl)
}

// =============================================
// List all available functions
// =============================================

export const CORE_LIBRARY_FUNCTIONS = [] as const;
export type CoreLibraryFunction = never;

