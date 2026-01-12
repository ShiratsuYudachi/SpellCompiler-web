import type { Value } from '../ast/ast'
import type { FunctionSpec } from './types'

const andImpl = (a: Value, b: Value) => {
	if (typeof a !== 'boolean' || typeof b !== 'boolean') {
		throw new Error(`and requires booleans, got ${typeof a} and ${typeof b}`)
	}
	return (a as boolean) && (b as boolean)
}

const orImpl = (a: Value, b: Value) => {
	if (typeof a !== 'boolean' || typeof b !== 'boolean') {
		throw new Error(`or requires booleans, got ${typeof a} and ${typeof b}`)
	}
	return (a as boolean) || (b as boolean)
}

const notImpl = (x: Value) => {
	if (typeof x !== 'boolean') {
		throw new Error(`not requires boolean, got ${typeof x}`)
	}
	return !(x as boolean)
}

export const logicFunctions: FunctionSpec[] = [
	{
		fullName: 'std::logic::and',
		params: { a: 'boolean', b: 'boolean' },
		returns: 'boolean',
		fn: andImpl,
		ui: { displayName: '🤝 and (both true)' },
	},
	{
		fullName: 'std::logic::or',
		params: { a: 'boolean', b: 'boolean' },
		returns: 'boolean',
		fn: orImpl,
		ui: { displayName: '🔀 or (either true)' },
	},
	{
		fullName: 'std::logic::not',
		params: { x: 'boolean' },
		returns: 'boolean',
		fn: notImpl,
		ui: { displayName: '🚫 not (invert)' },
	},
]


