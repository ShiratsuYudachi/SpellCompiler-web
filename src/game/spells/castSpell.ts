import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { Fireball, FireballStats, Lifetime, Owner, Velocity } from '../components'
import { query } from 'bitecs'
import type { Vector2D } from '../../editor/ast/ast'
import { isVector2D } from '../../editor/ast/ast'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
	const evaluator = new Evaluator()

	evaluator.registerNativeFunctionFullName('game::getPlayer', [], () => {
		return 'player'
	})

	evaluator.registerNativeFunctionFullName('game::teleportRelative', ['entityId', 'dx', 'dy'], (entityId, dx, dy) => {
		if (entityId !== 'self' && entityId !== 'player') {
			throw new Error(`Unknown entityId: ${String(entityId)}`)
		}
		if (typeof dx !== 'number' || typeof dy !== 'number') {
			throw new Error('teleportRelative requires numbers')
		}

		const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			throw new Error('Sprite not found')
		}

		const x = body.x + dx
		const y = body.y + dy
		Velocity.x[targetEid] = 0
		Velocity.y[targetEid] = 0
		body.setVelocity(0, 0)
		body.setPosition(x, y)
		return [x, y]
	})

	evaluator.registerNativeFunctionFullName('game::deflectAfterTime', ['angle', 'delayMs'], (angle, delayMs) => {
		if (typeof angle !== 'number' || typeof delayMs !== 'number') {
			throw new Error('deflectAfterTime requires two numbers (angle, delayMs)')
		}

		// Find the most recently spawned fireball owned by the caster
		let mostRecentEid = -1
		let mostRecentTime = -1

		for (const eid of query(world, [Fireball, Owner, Lifetime, FireballStats])) {
			if (Owner.eid[eid] === casterEid) {
				const bornAt = Lifetime.bornAt[eid]
				if (bornAt > mostRecentTime) {
					mostRecentTime = bornAt
					mostRecentEid = eid
				}
			}
		}

		if (mostRecentEid === -1) {
			throw new Error('No fireball found to deflect')
		}

		// Schedule deflection
		FireballStats.pendingDeflection[mostRecentEid] = angle
		FireballStats.deflectAtTime[mostRecentEid] = Date.now() + delayMs

		return true
	})

	evaluator.registerNativeFunctionFullName('game::getProjectileAge', [], () => {
		// Find the most recently spawned fireball owned by the caster
		let mostRecentEid = -1
		let mostRecentTime = -1

		for (const eid of query(world, [Fireball, Owner, Lifetime])) {
			if (Owner.eid[eid] === casterEid) {
				const bornAt = Lifetime.bornAt[eid]
				if (bornAt > mostRecentTime) {
					mostRecentTime = bornAt
					mostRecentEid = eid
				}
			}
		}

		if (mostRecentEid === -1) {
			return 0
		}

		return Date.now() - Lifetime.bornAt[mostRecentEid]
	})

	evaluator.registerNativeFunctionFullName('game::getProjectileDistance', [], () => {
		// Find the most recently spawned fireball owned by the caster
		let mostRecentEid = -1
		let mostRecentTime = -1

		for (const eid of query(world, [Fireball, Owner, Lifetime, FireballStats])) {
			if (Owner.eid[eid] === casterEid) {
				const bornAt = Lifetime.bornAt[eid]
				if (bornAt > mostRecentTime) {
					mostRecentTime = bornAt
					mostRecentEid = eid
				}
			}
		}

		if (mostRecentEid === -1) {
			return 0
		}

		const body = world.resources.bodies.get(mostRecentEid)
		if (!body) {
			return 0
		}

		const initialX = FireballStats.initialX[mostRecentEid]
		const initialY = FireballStats.initialY[mostRecentEid]
		const dx = body.x - initialX
		const dy = body.y - initialY

		return Math.sqrt(dx * dx + dy * dy)
	})

	// =============================================
	// Game Vector Functions
	// =============================================

	// game::getPlayerPosition() - Get player position as Vector2D
	evaluator.registerNativeFunctionFullName('game::getPlayerPosition', [], () => {
		const body = world.resources.bodies.get(world.resources.playerEid)
		if (!body) {
			throw new Error('Player body not found')
		}
		return {
			type: 'vector2d',
			x: body.x,
			y: body.y
		} as Vector2D
	})

	// game::getCasterPosition() - Get caster position as Vector2D
	evaluator.registerNativeFunctionFullName('game::getCasterPosition', [], () => {
		const body = world.resources.bodies.get(casterEid)
		if (!body) {
			throw new Error('Caster body not found')
		}
		return {
			type: 'vector2d',
			x: body.x,
			y: body.y
		} as Vector2D
	})

	// game::teleportToPosition(entityId, position) - Teleport entity to absolute position
	evaluator.registerNativeFunctionFullName('game::teleportToPosition', ['entityId', 'position'], (entityId, position) => {
		if (!isVector2D(position)) {
			throw new Error('game::teleportToPosition second argument must be a Vector2D')
		}

		if (entityId !== 'self' && entityId !== 'player') {
			throw new Error(`Unknown entityId: ${String(entityId)}`)
		}

		const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			throw new Error('Entity body not found')
		}

		const vec = position as Vector2D
		Velocity.x[targetEid] = 0
		Velocity.y[targetEid] = 0
		body.setVelocity(0, 0)
		body.setPosition(vec.x, vec.y)
		return true
	})

	// game::teleportRelative(entityId, offset) - Teleport entity by relative offset
	evaluator.registerNativeFunctionFullName('game::teleportRelative', ['entityId', 'offset'], (entityId, offset) => {
		if (!isVector2D(offset)) {
			throw new Error('game::teleportRelative second argument must be a Vector2D')
		}

		if (entityId !== 'self' && entityId !== 'player') {
			throw new Error(`Unknown entityId: ${String(entityId)}`)
		}

		const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			throw new Error('Entity body not found')
		}

		const vec = offset as Vector2D
		const newX = body.x + vec.x
		const newY = body.y + vec.y

		Velocity.x[targetEid] = 0
		Velocity.y[targetEid] = 0
		body.setVelocity(0, 0)
		body.setPosition(newX, newY)
		return true
	})

	for (const fn of spell.dependencies || []) {
		evaluator.registerFunction(fn)
	}

	return evaluator.run(spell.ast)
}



