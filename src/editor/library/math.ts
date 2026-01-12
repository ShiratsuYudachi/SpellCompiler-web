import type { Value } from '../ast/ast'
import type { FunctionSpec } from './types'

export const mathFunctions: FunctionSpec[] = [
	{
		fullName: 'std::math::add',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`add requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) + (b as number)
		},
		ui: { displayName: '➕ add' },
	},
	{
		fullName: 'std::math::subtract',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`subtract requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) - (b as number)
		},
		ui: { displayName: '➖ subtract' },
	},
	{
		fullName: 'std::math::multiply',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`multiply requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) * (b as number)
		},
		ui: { displayName: '✖️ multiply' },
	},
	{
		fullName: 'std::math::divide',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`divide requires numbers, got ${typeof a} and ${typeof b}`)
			}
			if ((b as number) === 0) {
				throw new Error('Division by zero')
			}
			return (a as number) / (b as number)
		},
		ui: { displayName: '➗ divide' },
	},
	{
		fullName: 'std::math::negate',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`negate requires number, got ${typeof x}`)
			}
			return -(x as number)
		},
		ui: { displayName: '🧲 negate' },
	},
	{
		fullName: 'std::math::abs',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`abs requires number, got ${typeof x}`)
			}
			return Math.abs(x as number)
		},
		ui: { displayName: '📏 abs' },
	},
	{
		fullName: 'std::math::mod',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`mod requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) % (b as number)
		},
		ui: { displayName: '🧮 mod' },
	},

	{
		fullName: 'std::cmp::gt',
		params: { a: 'number', b: 'number' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`gt requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) > (b as number)
		},
		ui: { displayName: '🔼 gt' },
	},
	{
		fullName: 'std::cmp::lt',
		params: { a: 'number', b: 'number' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`lt requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) < (b as number)
		},
		ui: { displayName: '🔽 lt' },
	},
	{
		fullName: 'std::cmp::gte',
		params: { a: 'number', b: 'number' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`gte requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) >= (b as number)
		},
		ui: { displayName: '⏫ gte' },
	},
	{
		fullName: 'std::cmp::lte',
		params: { a: 'number', b: 'number' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`lte requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return (a as number) <= (b as number)
		},
		ui: { displayName: '⏬ lte' },
	},
	{
		fullName: 'std::cmp::eq',
		params: { a: 'value', b: 'value' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => a === b,
		ui: { displayName: '🟰 eq' },
	},
	{
		fullName: 'std::cmp::neq',
		params: { a: 'value', b: 'value' },
		returns: 'boolean',
		fn: (a: Value, b: Value) => a !== b,
		ui: { displayName: '🚫 neq' },
	},

	{
		fullName: 'std::math::power',
		params: { base: 'number', exp: 'number' },
		returns: 'number',
		fn: (base: Value, exp: Value) => {
			if (typeof base !== 'number' || typeof exp !== 'number') {
				throw new Error(`power requires numbers, got ${typeof base} and ${typeof exp}`)
			}
			return Math.pow(base as number, exp as number)
		},
		ui: { displayName: '⚡ power' },
	},
	{
		fullName: 'std::math::sqrt',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`sqrt requires number, got ${typeof x}`)
			}
			return Math.sqrt(x as number)
		},
		ui: { displayName: '📐 sqrt' },
	},
	{
		fullName: 'std::math::floor',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`floor requires number, got ${typeof x}`)
			}
			return Math.floor(x as number)
		},
		ui: { displayName: '⬇️ floor' },
	},
	{
		fullName: 'std::math::ceil',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`ceil requires number, got ${typeof x}`)
			}
			return Math.ceil(x as number)
		},
		ui: { displayName: '⬆️ ceil' },
	},
	{
		fullName: 'std::math::round',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`round requires number, got ${typeof x}`)
			}
			return Math.round(x as number)
		},
		ui: { displayName: '🎯 round' },
	},
	{
		fullName: 'std::math::min',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`min requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return Math.min(a as number, b as number)
		},
		ui: { displayName: '📉 min' },
	},
	{
		fullName: 'std::math::max',
		params: { a: 'number', b: 'number' },
		returns: 'number',
		fn: (a: Value, b: Value) => {
			if (typeof a !== 'number' || typeof b !== 'number') {
				throw new Error(`max requires numbers, got ${typeof a} and ${typeof b}`)
			}
			return Math.max(a as number, b as number)
		},
		ui: { displayName: '📈 max' },
	},
	{
		fullName: 'std::math::sin',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`sin requires number, got ${typeof x}`)
			}
			return Math.sin(x as number)
		},
		ui: { displayName: '🌊 sin' },
	},
	{
		fullName: 'std::math::cos',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`cos requires number, got ${typeof x}`)
			}
			return Math.cos(x as number)
		},
		ui: { displayName: '🌙 cos' },
	},
	{
		fullName: 'std::math::tan',
		params: { x: 'number' },
		returns: 'number',
		fn: (x: Value) => {
			if (typeof x !== 'number') {
				throw new Error(`tan requires number, got ${typeof x}`)
			}
			return Math.tan(x as number)
		},
		ui: { displayName: '📐 tan' },
	},
]


