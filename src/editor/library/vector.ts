import type { Value, Vector2D } from '../ast/ast'
import { isVector2D } from '../ast/ast'
import type { FunctionSpec } from './types'

export const vectorFunctions: FunctionSpec[] = [
	{
		fullName: 'vec::create',
		params: { x: 'number', y: 'number' },
		returns: 'vector2d',
		fn: (x: Value, y: Value) => {
			if (typeof x !== 'number' || typeof y !== 'number') {
				throw new Error(`vec::create requires two numbers, got ${typeof x} and ${typeof y}`)
			}
			return { type: 'vector2d', x: x as number, y: y as number } as Vector2D
		},
		ui: { displayName: '📐 create vector' },
	},
	{
		fullName: 'vec::getX',
		params: { v: 'vector2d' },
		returns: 'number',
		fn: (v: Value) => {
			if (!isVector2D(v)) {
				throw new Error(`vec::getX requires a vector, got ${typeof v}`)
			}
			return (v as Vector2D).x
		},
		ui: { displayName: '📍 get X' },
	},
	{
		fullName: 'vec::getY',
		params: { v: 'vector2d' },
		returns: 'number',
		fn: (v: Value) => {
			if (!isVector2D(v)) {
				throw new Error(`vec::getY requires a vector, got ${typeof v}`)
			}
			return (v as Vector2D).y
		},
		ui: { displayName: '📍 get Y' },
	},
	{
		fullName: 'vec::add',
		params: { v1: 'vector2d', v2: 'vector2d' },
		returns: 'vector2d',
		fn: (v1: Value, v2: Value) => {
			if (!isVector2D(v1) || !isVector2D(v2)) {
				throw new Error('vec::add requires two vectors')
			}
			const a = v1 as Vector2D
			const b = v2 as Vector2D
			return { type: 'vector2d', x: a.x + b.x, y: a.y + b.y } as Vector2D
		},
		ui: { displayName: '➕ add vectors' },
	},
	{
		fullName: 'vec::subtract',
		params: { v1: 'vector2d', v2: 'vector2d' },
		returns: 'vector2d',
		fn: (v1: Value, v2: Value) => {
			if (!isVector2D(v1) || !isVector2D(v2)) {
				throw new Error('vec::subtract requires two vectors')
			}
			const a = v1 as Vector2D
			const b = v2 as Vector2D
			return { type: 'vector2d', x: a.x - b.x, y: a.y - b.y } as Vector2D
		},
		ui: { displayName: '➖ subtract vectors' },
	},
	{
		fullName: 'vec::multiply',
		params: { v: 'vector2d', scalar: 'number' },
		returns: 'vector2d',
		fn: (v: Value, scalar: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::multiply first argument must be a vector')
			}
			if (typeof scalar !== 'number') {
				throw new Error('vec::multiply second argument must be a number')
			}
			const a = v as Vector2D
			return { type: 'vector2d', x: a.x * (scalar as number), y: a.y * (scalar as number) } as Vector2D
		},
		ui: { displayName: '✖️ multiply by scalar' },
	},
	{
		fullName: 'vec::divide',
		params: { v: 'vector2d', scalar: 'number' },
		returns: 'vector2d',
		fn: (v: Value, scalar: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::divide first argument must be a vector')
			}
			if (typeof scalar !== 'number') {
				throw new Error('vec::divide second argument must be a number')
			}
			if ((scalar as number) === 0) {
				throw new Error('vec::divide: division by zero')
			}
			const a = v as Vector2D
			return { type: 'vector2d', x: a.x / (scalar as number), y: a.y / (scalar as number) } as Vector2D
		},
		ui: { displayName: '➗ divide by scalar' },
	},
	{
		fullName: 'vec::length',
		params: { v: 'vector2d' },
		returns: 'number',
		fn: (v: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::length requires a vector')
			}
			const a = v as Vector2D
			return Math.sqrt(a.x * a.x + a.y * a.y)
		},
		ui: { displayName: '📏 vector length' },
	},
	{
		fullName: 'vec::normalize',
		params: { v: 'vector2d' },
		returns: 'vector2d',
		fn: (v: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::normalize requires a vector')
			}
			const a = v as Vector2D
			const len = Math.sqrt(a.x * a.x + a.y * a.y)
			if (len === 0) {
				throw new Error('vec::normalize: cannot normalize zero vector')
			}
			return { type: 'vector2d', x: a.x / len, y: a.y / len } as Vector2D
		},
		ui: { displayName: '🧭 normalize' },
	},
	{
		fullName: 'vec::dot',
		params: { v1: 'vector2d', v2: 'vector2d' },
		returns: 'number',
		fn: (v1: Value, v2: Value) => {
			if (!isVector2D(v1) || !isVector2D(v2)) {
				throw new Error('vec::dot requires two vectors')
			}
			const a = v1 as Vector2D
			const b = v2 as Vector2D
			return a.x * b.x + a.y * b.y
		},
		ui: { displayName: '🧮 dot' },
	},
	{
		fullName: 'vec::distance',
		params: { v1: 'vector2d', v2: 'vector2d' },
		returns: 'number',
		fn: (v1: Value, v2: Value) => {
			if (!isVector2D(v1) || !isVector2D(v2)) {
				throw new Error('vec::distance requires two vectors')
			}
			const a = v1 as Vector2D
			const b = v2 as Vector2D
			const dx = b.x - a.x
			const dy = b.y - a.y
			return Math.sqrt(dx * dx + dy * dy)
		},
		ui: { displayName: '📏 distance between' },
	},
	{
		fullName: 'vec::angle',
		params: { v: 'vector2d' },
		returns: 'number',
		fn: (v: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::angle requires a vector')
			}
			const a = v as Vector2D
			return Math.atan2(a.y, a.x)
		},
		ui: { displayName: '📐 vector angle' },
	},
	{
		fullName: 'vec::rotate',
		params: { v: 'vector2d', angle: 'number' },
		returns: 'vector2d',
		fn: (v: Value, angle: Value) => {
			if (!isVector2D(v)) {
				throw new Error('vec::rotate first argument must be a vector')
			}
			if (typeof angle !== 'number') {
				throw new Error('vec::rotate second argument must be a number (angle in radians)')
			}
			const a = v as Vector2D
			const ang = angle as number
			const cos = Math.cos(ang)
			const sin = Math.sin(ang)
			return { type: 'vector2d', x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos } as Vector2D
		},
		ui: { displayName: '🔄 rotate' },
	},
]


