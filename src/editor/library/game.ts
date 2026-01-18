import type { FunctionSpec } from './types'
import type { Evaluator } from '../ast/evaluator'
import type { Value } from '../ast/ast'
import type { GameWorld } from '../../game/gameWorld'
import type { CompiledSpell } from '../../game/spells/types'
import { Fireball, FireballStats, Lifetime, Owner, Velocity } from '../../game/components'
import { query } from 'bitecs'
import type { TriggerConfig, TriggerType } from '../../game/resources'

type Vector2D = { type: 'vector2d'; x: number; y: number }

function isVector2D(v: unknown): v is Vector2D {
	return Boolean(v) && typeof v === 'object' && (v as any).type === 'vector2d' && typeof (v as any).x === 'number' && typeof (v as any).y === 'number'
}

type RuntimeContext = {
	world: GameWorld
	casterEid: number
	spell: CompiledSpell
}

const runtimeContextMap = new WeakMap<Evaluator, RuntimeContext>()

export function setGameRuntimeContext(
	evaluator: Evaluator,
	world: GameWorld,
	casterEid: number,
	spell: CompiledSpell
) {
	runtimeContextMap.set(evaluator, { world, casterEid, spell })
}

function getRuntimeContext(evaluator: Evaluator): RuntimeContext | null {
	return runtimeContextMap.get(evaluator) || null
}

export function getGameFunctions(): FunctionSpec[] {
	return [
	{
		fullName: 'game::getPlayer',
		params: {},
		returns: 'string',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 'player'
			}
			return () => 'player'
		},
		ui: { displayName: '👤 getPlayer' },
	},
	{
		fullName: 'game::teleportRelative',
		params: { entityId: 'string', offset: 'value' },
		returns: 'value',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return (_entityId: Value, offset: Value) => offset
			}
			const { world, casterEid } = ctx
			return (entityId: Value, offset: Value) => {
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
			}
		},
		ui: { displayName: '🚀 teleportRelative' },
		parameterModes: {
			offset: [	
				{ mode: 'literal-xy', label: 'Literal (dx, dy)', params: ['dx', 'dy'] },
				{ mode: 'vector', label: 'Vector', params: ['offset'] },
			],
		},
	},
	{
		fullName: 'game::deflectAfterTime',
		params: { angle: 'number', delayMs: 'number' },
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world, casterEid } = ctx
			return (angle: Value, delayMs: Value) => {
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
			}
		},
		ui: { displayName: '↩️ deflectAfterTime' },
	},
	{
		fullName: 'game::getProjectileAge',
		params: {},
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world, casterEid } = ctx
			return () => {
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
			}
		},
		ui: { displayName: '⏱️ getProjectileAge' },
	},
	{
		fullName: 'game::getProjectileDistance',
		params: {},
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world, casterEid } = ctx
			return () => {
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
			}
		},
		ui: { displayName: '📏 getProjectileDistance' },
	},
	{
		fullName: 'game::getPlayerPosition',
		params: {},
		returns: 'vector2d',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D)
			}
			const { world } = ctx
			return () => {
				const body = world.resources.bodies.get(world.resources.playerEid)
				if (!body) throw new Error('Sprite not found')
				return { type: 'vector2d', x: body.x, y: body.y } as Vector2D
			}
		},
		ui: { displayName: '📍 getPlayerPosition' },
	},
	{
		fullName: 'game::getCasterPosition',
		params: {},
		returns: 'vector2d',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world, casterEid } = ctx
			return () => {
				const body = world.resources.bodies.get(casterEid)
				if (!body) throw new Error('Sprite not found')
				return { type: 'vector2d', x: body.x, y: body.y } as Vector2D
			}
		},
		ui: { displayName: '🎯 getCasterPosition' },
	},
	{
		fullName: 'game::teleportToPosition',
		params: { entityId: 'string', position: 'vector2d' },
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D)
			}
			const { world, casterEid } = ctx
			return (entityId: Value, position: Value) => {
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
			}
		},
		ui: { displayName: '🎯 teleportToPosition' },
		parameterModes: {
			position: [
				{ mode: 'literal-xy', label: 'Literal (x, y)', params: ['x', 'y'] },
				{ mode: 'vector', label: 'Vector', params: ['position'] },
			],
		},
	},
	{
		fullName: 'game::onTrigger',
		params: { triggerType: 'string', condition: 'value', action: 'function' },
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 1
			}
			const { world, casterEid, spell } = ctx
			return (triggerType: Value, condition: Value, action: Value) => {
				if (typeof triggerType !== 'string') {
					throw new Error('onTrigger first argument must be a string (triggerType)')
				}

				const validTypes: TriggerType[] = ['onEnemyNearby', 'onTimeInterval', 'onPlayerHurt', 'onEnemyKilled', 'onPlayerLowHealth']
				if (!validTypes.includes(triggerType as TriggerType)) {
					throw new Error(`Invalid triggerType: ${triggerType}.`)
				}

				// Check if action is a function
				if (!action || typeof action !== 'object' || (action as any).type !== 'function') {
					throw new Error('onTrigger third argument must be a function (Lambda). Connect an action like teleportRelative to onTrigger.')
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

				// Create a spell from the action function
				const actionFn = action as any
				const actionSpell: CompiledSpell = {
					ast: actionFn.definition.body,
					dependencies: spell.dependencies || []
				}

				const triggerId = world.resources.triggerIdCounter++
				const trigger: TriggerConfig = {
					id: triggerId,
					type,
					casterEid,
					spell: actionSpell, // Use the action spell instead of the whole spell
					params,
					lastTriggerTime: 0,
					active: true,
				}

				world.resources.triggers.set(triggerId, trigger)
				return triggerId
			}
		},
		ui: { displayName: '⚡ onTrigger' },
	},
	{
		fullName: 'game::getPlayerPlateColor',
		params: {},
		returns: 'string',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 'NONE'
			}
			const { world } = ctx
			return () => {
				return world.resources.currentPlateColor || 'NONE'
			}
		},
		ui: { displayName: '👤 getPlayerPlateColor' },
	},
	{
		fullName: 'game::getFireballPlateColor',
		params: {},
		returns: 'string',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 'NONE'
			}
			const { world, casterEid } = ctx
			return () => {
				// Find the most recent fireball owned by caster
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
					return 'NONE'
				}

				// Get fireball position and check plate
				const body = world.resources.bodies.get(mostRecentEid)
				if (!body) {
					return 'NONE'
				}

				// Check which plate the fireball is over
				for (const plate of world.resources.pressurePlates) {
					const bounds = plate.rect.getBounds()
					if (body.x > bounds.left && body.x < bounds.right &&
						body.y > bounds.top && body.y < bounds.bottom) {
						return plate.color
					}
				}
				return 'NONE'
			}
		},
		ui: { displayName: '🔥 getFireballPlateColor' },
	},
	{
		fullName: 'game::deflectOnPlate',
		params: { plateColor: 'string', angle: 'number' },
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world, casterEid } = ctx
			return (plateColor: Value, angle: Value) => {
				if (typeof plateColor !== 'string') {
					throw new Error('deflectOnPlate requires plateColor to be a string (RED or YELLOW)')
				}
				if (typeof angle !== 'number') {
					throw new Error('deflectOnPlate requires angle to be a number')
				}

				// Convert color string to number
				let colorNum = 0
				if (plateColor === 'RED') colorNum = 1
				else if (plateColor === 'YELLOW') colorNum = 2
				else {
					throw new Error(`Invalid plateColor: ${plateColor}. Use "RED" or "YELLOW"`)
				}

				// Find the most recent fireball owned by caster
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
					throw new Error('No fireball found to set plate deflection')
				}

				// Set plate-based deflection parameters
				FireballStats.deflectOnPlateColor[mostRecentEid] = colorNum
				FireballStats.deflectOnPlateAngle[mostRecentEid] = angle
				FireballStats.plateDeflected[mostRecentEid] = 0

				console.log(`[deflectOnPlate] Set fireball to deflect ${angle}° when over ${plateColor} plate`)
				return true
			}
		},
		ui: { displayName: '🎯 deflectOnPlate' },
	},
	{
		fullName: 'game::getSensorState',
		params: {},
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world } = ctx
			return () => {
				return world.resources.sensorState ?? true
			}
		},
		ui: { displayName: '📡 getSensorState' },
	},
	{
		fullName: 'game::getCollectedBallWeights',
		params: {},
		returns: 'list',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => []
			}
			const { world } = ctx
			return () => {
				// Get collected ball weights from level data
				const levelData = world.resources.levelData
				if (levelData && levelData.collectedBallWeights) {
					return levelData.collectedBallWeights as Value[]
				}
				return []
			}
		},
		ui: { displayName: '⚽ getCollectedBallWeights' },
	},
	{
		fullName: 'game::getWeight',
		params: {},
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world } = ctx
			return () => {
				// Get current ball weight from level data
				const levelData = world.resources.levelData
				if (levelData && typeof levelData.currentBallWeight === 'number') {
					return levelData.currentBallWeight
				}
				return 0
			}
		},
		ui: { displayName: '⚖️ getWeight' },
	},
	{
		fullName: 'game::measureWeight',
		params: {},
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world } = ctx
			return () => {
				// Get current ball weight from level data
				// This function returns the weight but doesn't display it to the player
				// The player's spell can use this value for comparisons
				const levelData = world.resources.levelData
				if (levelData && typeof levelData.currentBallWeight === 'number') {
					return levelData.currentBallWeight
				}
				return 0
			}
		},
		ui: { displayName: '📏 measureWeight' },
	},
	{
		fullName: 'game::getThreshold',
		params: {},
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 20
			}
			const { world } = ctx
			return () => {
				// Get threshold weight from level data (for Level 7 Task 2)
				const levelData = world.resources.levelData
				if (levelData && typeof levelData.thresholdWeight === 'number') {
					return levelData.thresholdWeight
				}
				return 20 // Default threshold
			}
		},
		ui: { displayName: '🎯 getThreshold' },
	},
	]
}

