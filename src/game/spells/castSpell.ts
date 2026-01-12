import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { Fireball, FireballStats, Lifetime, Owner, Velocity } from '../components'
import { query } from 'bitecs'
import type { Vector2D } from '../../editor/ast/ast'
import { isVector2D } from '../../editor/ast/ast'
import type { TriggerType, TriggerConfig } from '../resources'

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

	// =============================================
	// Trigger Functions
	// =============================================

	// game::onTrigger(triggerType, condition) - 注册一个触发器
	// triggerType: 'onEnemyNearby' | 'onTimeInterval' | 'onPlayerHurt' | 'onEnemyKilled' | 'onPlayerLowHealth'
	// condition: 根据类型不同，可以是数字（距离/时间间隔/生命值阈值）
	evaluator.registerNativeFunctionFullName('game::onTrigger', ['triggerType', 'condition'], (triggerType, condition) => {
		if (typeof triggerType !== 'string') {
			throw new Error('game::onTrigger first argument must be a string (triggerType)')
		}

		const validTypes: TriggerType[] = ['onEnemyNearby', 'onTimeInterval', 'onPlayerHurt', 'onEnemyKilled', 'onPlayerLowHealth']
		if (!validTypes.includes(triggerType as TriggerType)) {
			throw new Error(`Invalid triggerType: ${triggerType}. Valid types: ${validTypes.join(', ')}`)
		}

		const type = triggerType as TriggerType
		const params: TriggerConfig['params'] = {}

		// 根据触发器类型设置参数
		if (type === 'onEnemyNearby') {
			if (typeof condition !== 'number' || condition <= 0) {
				throw new Error('onEnemyNearby requires a positive number (distance in pixels)')
			}
			params.distance = condition
		} else if (type === 'onTimeInterval') {
			if (typeof condition !== 'number' || condition <= 0) {
				throw new Error('onTimeInterval requires a positive number (interval in milliseconds)')
			}
			params.intervalMs = condition
		} else if (type === 'onPlayerLowHealth') {
			if (typeof condition !== 'number' || condition < 0 || condition > 1) {
				throw new Error('onPlayerLowHealth requires a number between 0 and 1 (health threshold)')
			}
			params.healthThreshold = condition
		} else if (type === 'onPlayerHurt' || type === 'onEnemyKilled') {
			// 这些类型不需要条件参数
		}

		// 注册触发器
		const triggerId = world.resources.triggerIdCounter++
		const trigger: TriggerConfig = {
			id: triggerId,
			type,
			casterEid,
			spell: { ...spell }, // 复制法术
			params,
			lastTriggerTime: 0,
			active: true,
		}

		world.resources.triggers.set(triggerId, trigger)

		return triggerId
	})

	for (const fn of spell.dependencies || []) {
		evaluator.registerFunction(fn)
	}

	return evaluator.run(spell.ast)
}



