import type { Value } from '../ast/ast'
import type { FunctionSpec } from './types'

const listImpl = (...args: Value[]) => args

const consImpl = (head: Value, tail: Value) => {
	if (!Array.isArray(tail)) {
		throw new Error(`cons requires second argument to be a list, got ${typeof tail}`)
	}
	return [head, ...(tail as Value[])]
}

const emptyImpl = () => []

const appendImpl = (list: Value, element: Value) => {
	if (!Array.isArray(list)) {
		throw new Error('First argument to append must be a list')
	}
	return [...(list as Value[]), element]
}

const rangeImpl = (start: Value, end: Value) => {
	if (typeof start !== 'number' || typeof end !== 'number') {
		throw new Error('range requires numbers')
	}
	const result: Value[] = []
	const s = start as number
	const e = end as number
	for (let i = s; i <= e; i++) {
		result.push(i)
	}
	return result
}

const lengthImpl = (list: Value) => {
	if (!Array.isArray(list)) {
		throw new Error('length requires a list')
	}
	return (list as Value[]).length
}

const nthImpl = (list: Value, index: Value) => {
	if (!Array.isArray(list)) {
		throw new Error('First argument to nth must be a list')
	}
	if (typeof index !== 'number') {
		throw new Error('Second argument to nth must be a number')
	}
	const idx = index as number
	const arr = list as Value[]
	if (idx < 0 || idx >= arr.length) {
		throw new Error(`Index ${idx} out of bounds for list of length ${arr.length}`)
	}
	return arr[idx]
}

const concatImpl = (list1: Value, list2: Value) => {
	if (!Array.isArray(list1) || !Array.isArray(list2)) {
		throw new Error('concat requires two lists')
	}
	return [...(list1 as Value[]), ...(list2 as Value[])]
}

const headImpl = (list: Value) => {
	if (!Array.isArray(list)) {
		throw new Error('head requires a list')
	}
	const arr = list as Value[]
	if (arr.length === 0) {
		throw new Error('head called on empty list')
	}
	return arr[0]
}

const tailImpl = (list: Value) => {
	if (!Array.isArray(list)) {
		throw new Error('tail requires a list')
	}
	const arr = list as Value[]
	if (arr.length === 0) {
		throw new Error('tail called on empty list')
	}
	return arr.slice(1)
}

export const listFunctions: FunctionSpec[] = [
	{
		fullName: 'std::list::list',
		params: {},
		returns: 'list',
		fn: listImpl,
		ui: { displayName: '📚 create list' },
	},
	{
		fullName: 'std::list::cons',
		params: { head: 'value', tail: 'list' },
		returns: 'list',
		fn: consImpl,
		ui: { displayName: '➕ prepend (cons)' },
	},
	{
		fullName: 'std::list::empty',
		params: {},
		returns: 'list',
		fn: emptyImpl,
		ui: { displayName: '🗑️ empty list' },
	},
	{
		fullName: 'std::list::append',
		params: { list: 'list', element: 'value' },
		returns: 'list',
		fn: appendImpl,
		ui: { displayName: '➕ append to list' },
	},
	{
		fullName: 'std::list::range',
		params: { start: 'number', end: 'number' },
		returns: 'list',
		fn: rangeImpl,
		ui: { displayName: '📈 number range' },
	},
	{
		fullName: 'std::list::map',
		params: { fnName: 'string', list: 'list' },
		returns: 'list',
		getFn: (evaluator) => (fnName: Value, list: Value) => {
			if (typeof fnName !== 'string') {
				throw new Error('First argument to map must be function name (string)')
			}
			if (!Array.isArray(list)) {
				throw new Error('Second argument to map must be a list')
			}
			return (list as Value[]).map((item) => evaluator.callFunction(fnName as string, item))
		},
		ui: { displayName: '🗺️ map' },
	},
	{
		fullName: 'std::list::filter',
		params: { fnName: 'string', list: 'list' },
		returns: 'list',
		getFn: (evaluator) => (fnName: Value, list: Value) => {
			if (typeof fnName !== 'string') {
				throw new Error('First argument to filter must be function name (string)')
			}
			if (!Array.isArray(list)) {
				throw new Error('Second argument to filter must be a list')
			}
			return (list as Value[]).filter((item) => {
				const result = evaluator.callFunction(fnName as string, item)
				if (typeof result !== 'boolean') {
					throw new Error('Filter function must return boolean')
				}
				return result
			})
		},
		ui: { displayName: '🧹 filter' },
	},
	{
		fullName: 'std::list::reduce',
		params: { fnName: 'string', init: 'value', list: 'list' },
		returns: 'value',
		getFn: (evaluator) => (fnName: Value, init: Value, list: Value) => {
			if (typeof fnName !== 'string') {
				throw new Error('First argument to reduce must be function name (string)')
			}
			if (!Array.isArray(list)) {
				throw new Error('Third argument to reduce must be a list')
			}
			return (list as Value[]).reduce((acc, item) => evaluator.callFunction(fnName as string, acc, item), init)
		},
		ui: { displayName: '🧮 reduce' },
	},
	{
		fullName: 'std::list::length',
		params: { list: 'list' },
		returns: 'number',
		fn: lengthImpl,
		ui: { displayName: '📏 list length' },
	},
	{
		fullName: 'std::list::nth',
		params: { list: 'list', index: 'number' },
		returns: 'value',
		fn: nthImpl,
		ui: { displayName: '🔢 get element (nth)' },
	},
	{
		fullName: 'std::list::concat',
		params: { list1: 'list', list2: 'list' },
		returns: 'list',
		fn: concatImpl,
		ui: { displayName: '🔗 concat lists' },
	},
	{
		fullName: 'std::list::head',
		params: { list: 'list' },
		returns: 'value',
		fn: headImpl,
		ui: { displayName: '🧠 first element (head)' },
	},
	{
		fullName: 'std::list::tail',
		params: { list: 'list' },
		returns: 'list',
		fn: tailImpl,
		ui: { displayName: '🐾 rest of list (tail)' },
	},
]


