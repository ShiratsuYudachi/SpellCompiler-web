// =============================================
// Core Library - Predefined Functions
// 核心函数库 - 预定义函数
// =============================================

import type { Value } from './ast';
import type { Evaluator } from './evaluator';

/**
 * Register all core library functions to an evaluator
 * 将所有核心库函数注册到求值器
 */
export function registerCoreLibrary(evaluator: Evaluator): void {
	// Arithmetic Operations (算术运算)
	registerArithmeticFunctions(evaluator);
	
	// Comparison Operations (比较运算)
	registerComparisonFunctions(evaluator);
	
	// Logical Operations (逻辑运算)
	registerLogicalFunctions(evaluator);
	
	// List Operations (列表运算)
	registerListFunctions(evaluator);
	
	// Math Functions (数学函数)
	registerMathFunctions(evaluator);
	
	// String Functions (字符串函数)
	registerStringFunctions(evaluator);
}

// =============================================
// Arithmetic Operations (算术运算)
// =============================================

function registerArithmeticFunctions(evaluator: Evaluator): void {
	// add(a, b) - 加法
	evaluator.registerNativeFunction('add', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`add requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) + (b as number);
	});

	// subtract(a, b) - 减法
	evaluator.registerNativeFunction('subtract', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`subtract requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) - (b as number);
	});

	// multiply(a, b) - 乘法
	evaluator.registerNativeFunction('multiply', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`multiply requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) * (b as number);
	});

	// divide(a, b) - 除法
	evaluator.registerNativeFunction('divide', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`divide requires numbers, got ${typeof a} and ${typeof b}`);
		}
		if ((b as number) === 0) {
			throw new Error('Division by zero');
		}
		return (a as number) / (b as number);
	});

	// negate(x) - 取负
	evaluator.registerNativeFunction('negate', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`negate requires number, got ${typeof x}`);
		}
		return -(x as number);
	});

	// abs(x) - 绝对值
	evaluator.registerNativeFunction('abs', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`abs requires number, got ${typeof x}`);
		}
		return Math.abs(x as number);
	});

	// mod(a, b) - 取模
	evaluator.registerNativeFunction('mod', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`mod requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) % (b as number);
	});
}

// =============================================
// Comparison Operations (比较运算)
// =============================================

function registerComparisonFunctions(evaluator: Evaluator): void {
	// gt(a, b) - 大于 (>)
	evaluator.registerNativeFunction('gt', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) > (b as number);
	});

	// lt(a, b) - 小于 (<)
	evaluator.registerNativeFunction('lt', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lt requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) < (b as number);
	});

	// gte(a, b) - 大于等于 (>=)
	evaluator.registerNativeFunction('gte', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`gte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) >= (b as number);
	});

	// lte(a, b) - 小于等于 (<=)
	evaluator.registerNativeFunction('lte', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`lte requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return (a as number) <= (b as number);
	});

	// eq(a, b) - 等于 (==)
	evaluator.registerNativeFunction('eq', ['a', 'b'], (a, b) => {
		return a === b;
	});

	// neq(a, b) - 不等于 (!=)
	evaluator.registerNativeFunction('neq', ['a', 'b'], (a, b) => {
		return a !== b;
	});
}

// =============================================
// Logical Operations (逻辑运算)
// =============================================

function registerLogicalFunctions(evaluator: Evaluator): void {
	// and(a, b) - 逻辑与 (&&)
	evaluator.registerNativeFunction('and', ['a', 'b'], (a, b) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`and requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) && (b as boolean);
	});

	// or(a, b) - 逻辑或 (||)
	evaluator.registerNativeFunction('or', ['a', 'b'], (a, b) => {
		if (typeof a !== 'boolean' || typeof b !== 'boolean') {
			throw new Error(`or requires booleans, got ${typeof a} and ${typeof b}`);
		}
		return (a as boolean) || (b as boolean);
	});

	// not(x) - 逻辑非 (!)
	evaluator.registerNativeFunction('not', ['x'], (x) => {
		if (typeof x !== 'boolean') {
			throw new Error(`not requires boolean, got ${typeof x}`);
		}
		return !(x as boolean);
	});
}

// =============================================
// List Operations (列表运算)
// =============================================

function registerListFunctions(evaluator: Evaluator): void {
	// map(fnName, list) - 映射
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

	// filter(fnName, list) - 过滤
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

	// reduce(fnName, init, list) - 归约
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

	// length(list) - 列表长度
	evaluator.registerNativeFunction('length', ['list'], (list) => {
		if (!Array.isArray(list)) {
			throw new Error('length requires a list');
		}
		return (list as Value[]).length;
	});

	// nth(list, index) - 获取第 n 个元素
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

	// concat(list1, list2) - 连接两个列表
	evaluator.registerNativeFunction('concat', ['list1', 'list2'], (list1, list2) => {
		if (!Array.isArray(list1) || !Array.isArray(list2)) {
			throw new Error('concat requires two lists');
		}
		return [...(list1 as Value[]), ...(list2 as Value[])];
	});

	// head(list) - 获取第一个元素
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

	// tail(list) - 获取除第一个元素外的所有元素
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
// Math Functions (数学函数)
// =============================================

function registerMathFunctions(evaluator: Evaluator): void {
	// power(base, exp) - 幂运算
	evaluator.registerNativeFunction('power', ['base', 'exp'], (base, exp) => {
		if (typeof base !== 'number' || typeof exp !== 'number') {
			throw new Error(`power requires numbers, got ${typeof base} and ${typeof exp}`);
		}
		return Math.pow(base as number, exp as number);
	});

	// sqrt(x) - 平方根
	evaluator.registerNativeFunction('sqrt', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`sqrt requires number, got ${typeof x}`);
		}
		return Math.sqrt(x as number);
	});

	// floor(x) - 向下取整
	evaluator.registerNativeFunction('floor', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`floor requires number, got ${typeof x}`);
		}
		return Math.floor(x as number);
	});

	// ceil(x) - 向上取整
	evaluator.registerNativeFunction('ceil', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`ceil requires number, got ${typeof x}`);
		}
		return Math.ceil(x as number);
	});

	// round(x) - 四舍五入
	evaluator.registerNativeFunction('round', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`round requires number, got ${typeof x}`);
		}
		return Math.round(x as number);
	});

	// min(a, b) - 最小值
	evaluator.registerNativeFunction('min', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`min requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.min(a as number, b as number);
	});

	// max(a, b) - 最大值
	evaluator.registerNativeFunction('max', ['a', 'b'], (a, b) => {
		if (typeof a !== 'number' || typeof b !== 'number') {
			throw new Error(`max requires numbers, got ${typeof a} and ${typeof b}`);
		}
		return Math.max(a as number, b as number);
	});

	// sin(x) - 正弦
	evaluator.registerNativeFunction('sin', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`sin requires number, got ${typeof x}`);
		}
		return Math.sin(x as number);
	});

	// cos(x) - 余弦
	evaluator.registerNativeFunction('cos', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`cos requires number, got ${typeof x}`);
		}
		return Math.cos(x as number);
	});

	// tan(x) - 正切
	evaluator.registerNativeFunction('tan', ['x'], (x) => {
		if (typeof x !== 'number') {
			throw new Error(`tan requires number, got ${typeof x}`);
		}
		return Math.tan(x as number);
	});
}

// =============================================
// String Functions (字符串函数)
// =============================================

function registerStringFunctions(evaluator: Evaluator): void {
	// strConcat(a, b) - 字符串连接
	evaluator.registerNativeFunction('strConcat', ['a', 'b'], (a, b) => {
		return String(a) + String(b);
	});

	// strLength(s) - 字符串长度
	evaluator.registerNativeFunction('strLength', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strLength requires string, got ${typeof s}`);
		}
		return (s as string).length;
	});

	// strSubstring(s, start, end) - 字符串截取
	evaluator.registerNativeFunction('strSubstring', ['s', 'start', 'end'], (s, start, end) => {
		if (typeof s !== 'string') {
			throw new Error(`strSubstring requires string, got ${typeof s}`);
		}
		if (typeof start !== 'number' || typeof end !== 'number') {
			throw new Error('strSubstring start and end must be numbers');
		}
		return (s as string).substring(start as number, end as number);
	});

	// strToUpper(s) - 转大写
	evaluator.registerNativeFunction('strToUpper', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strToUpper requires string, got ${typeof s}`);
		}
		return (s as string).toUpperCase();
	});

	// strToLower(s) - 转小写
	evaluator.registerNativeFunction('strToLower', ['s'], (s) => {
		if (typeof s !== 'string') {
			throw new Error(`strToLower requires string, got ${typeof s}`);
		}
		return (s as string).toLowerCase();
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
	// List
	'map', 'filter', 'reduce', 'length', 'nth', 'concat', 'head', 'tail',
	// Math
	'power', 'sqrt', 'floor', 'ceil', 'round', 'min', 'max', 'sin', 'cos', 'tan',
	// String
	'strConcat', 'strLength', 'strSubstring', 'strToUpper', 'strToLower'
] as const;

export type CoreLibraryFunction = typeof CORE_LIBRARY_FUNCTIONS[number];

