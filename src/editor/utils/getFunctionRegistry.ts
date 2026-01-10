// =============================================
// Function Registry
//
// =============================================

// Parameter mode types
export type ParameterMode = 'literal-xy' | 'vector' | 'default';

export interface ParameterModeOption {
	mode: ParameterMode;
	label: string;
	params: string[];  // Parameter names for this mode
}

export interface FunctionInfo {
	name: string;           // Full function name
	displayName: string;    // Display name
	namespace: string;      // Namespace ('std', 'game', 'user')
	paramCount: number;     // Number of parameters
	params: string[];       // Parameter names
	isNative: boolean;      // Is native function
	parameterModes?: Record<string, ParameterModeOption[]>;  // Parameter mode options for specific params
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
		// Functional Utilities
		{ name: 'tap', params: ['value', 'fn'] },
		{ name: 'print', params: ['value'] },
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

	const gameFunctions: Array<{
		name: string;
		params: string[];
		parameterModes?: Record<string, ParameterModeOption[]>;
	}> = [
		{ name: 'getPlayer', params: [] },
		{
			name: 'teleportRelative',
			params: ['entityId', 'offset'],  // Generic param name
			parameterModes: {
				'offset': [
					{
						mode: 'literal-xy',
						label: 'Literal (dx, dy)',
						params: ['dx', 'dy']
					},
					{
						mode: 'vector',
						label: 'Vector',
						params: ['offset']
					}
				]
			}
		},
		{ name: 'deflectAfterTime', params: ['angle', 'delayMs'] },
		{ name: 'getProjectileAge', params: [] },
		{ name: 'getProjectileDistance', params: [] },
		// Vector-based game functions
		{ name: 'getPlayerPosition', params: [] },
		{ name: 'getCasterPosition', params: [] },
		{
			name: 'teleportToPosition',
			params: ['entityId', 'position'],
			parameterModes: {
				'position': [
					{
						mode: 'literal-xy',
						label: 'Literal (x, y)',
						params: ['x', 'y']
					},
					{
						mode: 'vector',
						label: 'Vector',
						params: ['position']
					}
				]
			}
		},
	]

	for (const fn of gameFunctions) {
		const fullName = `game::${fn.name}`
		functions.push({
			name: fullName,
			displayName: fn.name,
			namespace: 'game',
			paramCount: fn.params.length,
			params: fn.params,
			isNative: true,
			parameterModes: fn.parameterModes,
		})
	}

	// Vector functions
	const vectorFunctions = [
		{ name: 'create', params: ['x', 'y'] },
		{ name: 'getX', params: ['v'] },
		{ name: 'getY', params: ['v'] },
		{ name: 'add', params: ['v1', 'v2'] },
		{ name: 'subtract', params: ['v1', 'v2'] },
		{ name: 'multiply', params: ['v', 'scalar'] },
		{ name: 'divide', params: ['v', 'scalar'] },
		{ name: 'length', params: ['v'] },
		{ name: 'normalize', params: ['v'] },
		{ name: 'dot', params: ['v1', 'v2'] },
		{ name: 'distance', params: ['v1', 'v2'] },
		{ name: 'angle', params: ['v'] },
		{ name: 'rotate', params: ['v', 'angle'] },
	];

	for (const fn of vectorFunctions) {
		const fullName = `vec::${fn.name}`;
		functions.push({
			name: fullName,
			displayName: fn.name,
			namespace: 'vec',
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
