import type { Evaluator } from '../../editor/ast/evaluator'
import type { GameWorld } from '../gameWorld'
import { Fireball, FireballStats, Lifetime, Owner, Velocity } from '../components'
import type { Value } from '../../editor/ast/ast'
import { query } from 'bitecs'
import type { TriggerConfig, TriggerType } from '../resources'
import type { CompiledSpell } from './types'

type Vector2D = { type: 'vector2d'; x: number; y: number }

function isVector2D(v: unknown): v is Vector2D {
	return Boolean(v) && typeof v === 'object' && (v as any).type === 'vector2d' && typeof (v as any).x === 'number' && typeof (v as any).y === 'number'
}

export function registerGameFunctionsForPreview(evaluator: Evaluator) {
	evaluator.registerFunction({
		fullName: 'game::getPlayer',
		params: [],
		fn: () => 'player',
		ui: { displayName: 'getPlayer' },
	})

	evaluator.registerFunction({
		fullName: 'game::teleportRelative',
		params: ['entityId', 'offset'],
		fn: (_entityId, offset) => offset as Value,
		ui: { displayName: 'teleportRelative' },
		parameterModes: {
			offset: [
				{ mode: 'literal-xy', label: 'Literal (dx, dy)', params: ['dx', 'dy'] },
				{ mode: 'vector', label: 'Vector', params: ['offset'] },
			],
		},
	})

	evaluator.registerFunction({
		fullName: 'game::deflectAfterTime',
		params: ['angle', 'delayMs'],
		fn: () => true,
		ui: { displayName: 'deflectAfterTime' },
	})

	evaluator.registerFunction({
		fullName: 'game::getProjectileAge',
		params: [],
		fn: () => 0,
		ui: { displayName: 'getProjectileAge' },
	})

	evaluator.registerFunction({
		fullName: 'game::getProjectileDistance',
		params: [],
		fn: () => 0,
		ui: { displayName: 'getProjectileDistance' },
	})

	evaluator.registerFunction({
		fullName: 'game::getPlayerPosition',
		params: [],
		fn: () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D),
		ui: { displayName: 'getPlayerPosition' },
	})

	evaluator.registerFunction({
		fullName: 'game::getCasterPosition',
		params: [],
		fn: () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D),
		ui: { displayName: 'getCasterPosition' },
	})

	evaluator.registerFunction({
		fullName: 'game::teleportToPosition',
		params: ['entityId', 'position'],
		fn: () => true,
		ui: { displayName: 'teleportToPosition' },
		parameterModes: {
			position: [
				{ mode: 'literal-xy', label: 'Literal (x, y)', params: ['x', 'y'] },
				{ mode: 'vector', label: 'Vector', params: ['position'] },
			],
		},
	})

	evaluator.registerFunction({
		fullName: 'game::onTrigger',
		params: ['triggerType', 'condition'],
		fn: () => 1,
		ui: { displayName: 'onTrigger' },
	})
}

export function registerGameFunctionsForRuntime(evaluator: Evaluator, world: GameWorld, casterEid: number, spell: CompiledSpell) {
	evaluator.registerFunction({
		fullName: 'game::getPlayer',
		params: [],
		fn: () => 'player',
		ui: { displayName: 'getPlayer' },
	})

	evaluator.registerFunction({
		fullName: 'game::teleportRelative',
		params: ['entityId', 'offset'],
		fn: (entityId, offset) => {
			if (entityId !== 'self' && entityId !== 'player') {
				throw new Error(`Unknown entityId: ${String(entityId)}`)
			}
			if (!isVector2D(offset)) {
				throw new Error('teleportRelative requires a vector2d offset')
			}

			const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
			const body = world.resources.bodies.get(targetEid)
			if (!body) {
				throw new Error('Sprite not found')
			}

			const x = body.x + offset.x
			const y = body.y + offset.y
			Velocity.x[targetEid] = 0
			Velocity.y[targetEid] = 0
			body.setVelocity(0, 0)
			body.setPosition(x, y)
			return [x, y] as Value
		},
		ui: { displayName: 'teleportRelative' },
		parameterModes: {
			offset: [
				{ mode: 'literal-xy', label: 'Literal (dx, dy)', params: ['dx', 'dy'] },
				{ mode: 'vector', label: 'Vector', params: ['offset'] },
			],
		},
	})

	evaluator.registerFunction({
		fullName: 'game::deflectAfterTime',
		params: ['angle', 'delayMs'],
		fn: (angle, delayMs) => {
			if (typeof angle !== 'number' || typeof delayMs !== 'number') {
				throw new Error('deflectAfterTime requires two numbers (angle, delayMs)')
			}

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

			FireballStats.pendingDeflection[mostRecentEid] = angle
			FireballStats.deflectAtTime[mostRecentEid] = Date.now() + delayMs
			return true
		},
		ui: { displayName: 'deflectAfterTime' },
	})

	evaluator.registerFunction({
		fullName: 'game::getProjectileAge',
		params: [],
		fn: () => {
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
		},
		ui: { displayName: 'getProjectileAge' },
	})

	evaluator.registerFunction({
		fullName: 'game::getProjectileDistance',
		params: [],
		fn: () => {
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
		},
		ui: { displayName: 'getProjectileDistance' },
	})

	evaluator.registerFunction({
		fullName: 'game::getPlayerPosition',
		params: [],
		fn: () => {
			const body = world.resources.bodies.get(world.resources.playerEid)
			if (!body) throw new Error('Sprite not found')
			return { type: 'vector2d', x: body.x, y: body.y } as Vector2D
		},
		ui: { displayName: 'getPlayerPosition' },
	})

	evaluator.registerFunction({
		fullName: 'game::getCasterPosition',
		params: [],
		fn: () => {
			const body = world.resources.bodies.get(casterEid)
			if (!body) throw new Error('Sprite not found')
			return { type: 'vector2d', x: body.x, y: body.y } as Vector2D
		},
		ui: { displayName: 'getCasterPosition' },
	})

	evaluator.registerFunction({
		fullName: 'game::teleportToPosition',
		params: ['entityId', 'position'],
		fn: (entityId, position) => {
			if (entityId !== 'self' && entityId !== 'player') {
				throw new Error(`Unknown entityId: ${String(entityId)}`)
			}
			if (!isVector2D(position)) {
				throw new Error('teleportToPosition requires a vector2d')
			}

			const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
			const body = world.resources.bodies.get(targetEid)
			if (!body) {
				throw new Error('Sprite not found')
			}

			Velocity.x[targetEid] = 0
			Velocity.y[targetEid] = 0
			body.setVelocity(0, 0)
			body.setPosition(position.x, position.y)
			return true
		},
		ui: { displayName: 'teleportToPosition' },
	})

	evaluator.registerFunction({
		fullName: 'game::onTrigger',
		params: ['triggerType', 'condition'],
		fn: (triggerType, condition) => {
			if (typeof triggerType !== 'string') {
				throw new Error('onTrigger first argument must be a string (triggerType)')
			}

			const validTypes: TriggerType[] = ['onEnemyNearby', 'onTimeInterval', 'onPlayerHurt', 'onEnemyKilled', 'onPlayerLowHealth']
			if (!validTypes.includes(triggerType as TriggerType)) {
				throw new Error(`Invalid triggerType: ${triggerType}.`)
			}

			const type = triggerType as TriggerType
			const params: TriggerConfig['params'] = {}

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
			}

			const triggerId = world.resources.triggerIdCounter++
			const trigger: TriggerConfig = {
				id: triggerId,
				type,
				casterEid,
				spell,
				params,
				lastTriggerTime: 0,
				active: true,
			}

			world.resources.triggers.set(triggerId, trigger)
			return triggerId
		},
		ui: { displayName: 'onTrigger' },
	})
}


