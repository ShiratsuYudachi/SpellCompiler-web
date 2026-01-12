import type { FunctionValue, Value } from '../ast/ast'
import type { FunctionSpec } from './types'

export const fnFunctions: FunctionSpec[] = [
	{
		fullName: 'std::fn::this',
		params: {},
		returns: 'function',
		fn: () => {
			throw new Error('std::fn::this can only be used inside a function')
		},
		ui: { displayName: '🪞 this' },
	},
	{
		fullName: 'std::fn::tap',
		params: { value: 'value', fn: 'function' },
		returns: 'value',
		getFn: (evaluator) => (value: Value, fn: Value) => {
			if (typeof fn !== 'object' || fn === null || (fn as any).type !== 'function') {
				throw new Error('Second argument to tap must be a function')
			}
			evaluator.callFunctionValue(fn as FunctionValue, value)
			return value
		},
		ui: { displayName: '🧷 tap' },
	},
	{
		fullName: 'std::fn::print',
		params: { value: 'value' },
		returns: 'value',
		fn: (value: Value) => {
			console.log(value)
			return value
		},
		ui: { displayName: '🖨️ print' },
	},
	{
		fullName: 'std::fn::debug',
		params: { label: 'value', value: 'value' },
		returns: 'value',
		fn: (label: Value, value: Value) => {
			console.log(`[DEBUG] ${String(label)}`, value)
			return value
		},
		ui: { displayName: '🐞 debug' },
	},
]


