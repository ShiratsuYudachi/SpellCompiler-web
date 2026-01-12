import type { Value } from '../ast/ast'
import type { FunctionSpec } from './types'

const concatImpl = (a: Value, b: Value) => String(a) + String(b)

const lengthImpl = (s: Value) => {
	if (typeof s !== 'string') {
		throw new Error(`strLength requires string, got ${typeof s}`)
	}
	return (s as string).length
}

const substringImpl = (s: Value, start: Value, end: Value) => {
	if (typeof s !== 'string') {
		throw new Error(`strSubstring requires string, got ${typeof s}`)
	}
	if (typeof start !== 'number' || typeof end !== 'number') {
		throw new Error('strSubstring start and end must be numbers')
	}
	return (s as string).substring(start as number, end as number)
}

const toUpperImpl = (s: Value) => {
	if (typeof s !== 'string') {
		throw new Error(`strToUpper requires string, got ${typeof s}`)
	}
	return (s as string).toUpperCase()
}

const toLowerImpl = (s: Value) => {
	if (typeof s !== 'string') {
		throw new Error(`strToLower requires string, got ${typeof s}`)
	}
	return (s as string).toLowerCase()
}

export const stringFunctions: FunctionSpec[] = [
	{
		fullName: 'std::str::concat',
		params: { a: 'value', b: 'value' },
		returns: 'string',
		fn: concatImpl,
		ui: { displayName: '🔤 concat strings' },
	},
	{
		fullName: 'std::str::length',
		params: { s: 'string' },
		returns: 'number',
		fn: lengthImpl,
		ui: { displayName: '📏 string length' },
	},
	{
		fullName: 'std::str::substring',
		params: { s: 'string', start: 'number', end: 'number' },
		returns: 'string',
		fn: substringImpl,
		ui: { displayName: '✂️ substring (slice)' },
	},
	{
		fullName: 'std::str::toUpper',
		params: { s: 'string' },
		returns: 'string',
		fn: toUpperImpl,
		ui: { displayName: '🔠 to uppercase' },
	},
	{
		fullName: 'std::str::toLower',
		params: { s: 'string' },
		returns: 'string',
		fn: toLowerImpl,
		ui: { displayName: '🔡 to lowercase' },
	},
]


