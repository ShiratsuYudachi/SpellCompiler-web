// =============================================
// Function Registry
// 获取所有已注册的函数信息
// =============================================

export interface FunctionInfo {
	name: string;           // 完整函数名（包括命名空间）
	displayName: string;    // 显示名称（不含命名空间）
	namespace: string;      // 命名空间（如 'std', 'game', 'user'）
	paramCount: number;     // 参数数量
	params: string[];       // 参数名称列表
	isNative: boolean;      // 是否是原生函数
}

/**
 * Extract namespace and display name from full function name
 */
export function parseFunctionName(fullName: string): { namespace: string; displayName: string } {
	const parts = fullName.split('::');
	if (parts.length === 2) {
		return { namespace: parts[0], displayName: parts[1] };
	}
	return { namespace: 'user', displayName: fullName };
}

/**
 * Get all registered functions from evaluator
 */
export function getFunctionRegistry(): FunctionInfo[] {
	const functions: FunctionInfo[] = [];
	
	// Access the function table (we need to expose it or use a getter)
	// For now, we'll return a hardcoded list of std:: functions
	// This will be improved when we add a proper API to Evaluator
	
	const stdFunctions = [
		// Special
		{ name: 'this', params: [] }, // Recursive call
		// Arithmetic
		{ name: 'add', params: ['a', 'b'] },
		{ name: 'subtract', params: ['a', 'b'] },
		{ name: 'multiply', params: ['a', 'b'] },
		{ name: 'divide', params: ['a', 'b'] },
		{ name: 'negate', params: ['x'] },
		{ name: 'abs', params: ['x'] },
		{ name: 'mod', params: ['a', 'b'] },
		// Comparison
		{ name: 'gt', params: ['a', 'b'] },
		{ name: 'lt', params: ['a', 'b'] },
		{ name: 'gte', params: ['a', 'b'] },
		{ name: 'lte', params: ['a', 'b'] },
		{ name: 'eq', params: ['a', 'b'] },
		{ name: 'neq', params: ['a', 'b'] },
		// Logical
		{ name: 'and', params: ['a', 'b'] },
		{ name: 'or', params: ['a', 'b'] },
		{ name: 'not', params: ['x'] },
		// Math
		{ name: 'max', params: ['a', 'b'] },
		{ name: 'min', params: ['a', 'b'] },
		{ name: 'power', params: ['base', 'exp'] },
		{ name: 'sqrt', params: ['x'] },
		{ name: 'floor', params: ['x'] },
		{ name: 'ceil', params: ['x'] },
		{ name: 'round', params: ['x'] },
		// List (variadic functions use empty params array)
		{ name: 'list', params: [] },
		{ name: 'cons', params: ['head', 'tail'] },
		{ name: 'empty', params: [] },
		{ name: 'head', params: ['list'] },
		{ name: 'tail', params: ['list'] },
		{ name: 'length', params: ['list'] },
		{ name: 'nth', params: ['list', 'index'] },
		{ name: 'append', params: ['list1', 'list2'] },
		{ name: 'concat', params: ['list1', 'list2'] },
		{ name: 'range', params: ['start', 'end'] },
		// Higher-order
		{ name: 'map', params: ['fn', 'list'] },
		{ name: 'filter', params: ['fn', 'list'] },
		{ name: 'reduce', params: ['fn', 'init', 'list'] },
	];
	
	for (const fn of stdFunctions) {
		const fullName = `std::${fn.name}`;
		functions.push({
			name: fullName,
			displayName: fn.name,
			namespace: 'std',
			paramCount: fn.params.length,
			params: fn.params,
			isNative: true
		});
	}
	
	return functions;
}

/**
 * Get functions grouped by namespace
 */
export function getFunctionsByNamespace(): Record<string, FunctionInfo[]> {
	const functions = getFunctionRegistry();
	const grouped: Record<string, FunctionInfo[]> = {};
	
	for (const fn of functions) {
		if (!grouped[fn.namespace]) {
			grouped[fn.namespace] = [];
		}
		grouped[fn.namespace].push(fn);
	}
	
	return grouped;
}

/**
 * Get function info by full name
 */
export function getFunctionInfo(fullName: string): FunctionInfo | undefined {
	const functions = getFunctionRegistry();
	return functions.find(fn => fn.name === fullName);
}
