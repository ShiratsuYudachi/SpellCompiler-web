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

				// 防止重复设置偏转：如果已经有 pending deflection，则跳过
				if (FireballStats.pendingDeflection[mostRecentEid] !== 0) {
					return false // 已有偏转等待执行，不重复设置
				}

				FireballStats.pendingDeflection[mostRecentEid] = angle
				FireballStats.deflectAtTime[mostRecentEid] = Date.now() + delayMs
				console.log(`[deflectAfterTime] Set deflection ${angle}° after ${delayMs}ms for fireball ${mostRecentEid}`)
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

				const validTypes: TriggerType[] = ['onEnemyNearby', 'onTimeInterval', 'onPlayerHurt', 'onEnemyKilled', 'onPlayerLowHealth', 'onFireballFlying']
				if (!validTypes.includes(triggerType as TriggerType)) {
					throw new Error(`Invalid triggerType: ${triggerType}.`)
				}

				// Handle action parameter - can be either:
				// 1. A function object { type: 'function', definition: { params, body } }
				// 2. A function name (string) that references a function in spell.dependencies
				let actionBody: any = null

				if (action && typeof action === 'object' && (action as any).type === 'function') {
					// Direct function object
					actionBody = (action as any).definition.body
				} else if (typeof action === 'string') {
					// Function name - look up in dependencies
					const funcDef = spell.dependencies?.find((fn: any) => fn.name === action)
					if (funcDef) {
						actionBody = funcDef.body
					} else {
						throw new Error(`onTrigger: function "${action}" not found in dependencies`)
					}
				} else {
					throw new Error('onTrigger third argument must be a function (Lambda). Connect a Return node with "fn" handle to onTrigger.')
				}

				if (!actionBody) {
					throw new Error('onTrigger: could not resolve action function body')
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
				} else if (type === 'onFireballFlying') {
					// onFireballFlying: condition is the check interval in ms (default 50ms)
					if (typeof condition === 'number' && condition > 0) {
						params.intervalMs = condition
					} else {
						params.intervalMs = 50 // Default: check every 50ms
					}
				}

				// Create a spell from the action function
				const actionSpell: CompiledSpell = {
					ast: actionBody,
					dependencies: spell.dependencies || []
				}

				const triggerId = world.resources.triggerIdCounter++
				const trigger: TriggerConfig = {
					id: triggerId,
					type,
					casterEid,
					spell: actionSpell,
					params,
					lastTriggerTime: 0,
					active: true,
				}

				world.resources.triggers.set(triggerId, trigger)
				console.log(`[onTrigger] Registered trigger ${triggerId} type=${type}`)
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

				// Apply plate-based deflection parameters to all active fireballs owned by caster
				let applied = false
				for (const eid of query(world, [Fireball, Owner, Lifetime, FireballStats])) {
					if (Owner.eid[eid] === casterEid) {
						FireballStats.deflectOnPlateColor[eid] = colorNum
						FireballStats.deflectOnPlateAngle[eid] = angle
						FireballStats.plateDeflected[eid] = 0
						applied = true
					}
				}

				if (!applied) {
					throw new Error('No fireball found to set plate deflection')
				}

				console.log(`[deflectOnPlate] Set deflection ${angle}° for player ${casterEid} fireballs when over ${plateColor} plate`)
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
	{
		fullName: 'game::setSlot',
		params: { slotId: 'number', value: 'number' },
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world } = ctx
			return (slotId: Value, value: Value) => {
				if (typeof slotId !== 'number' || typeof value !== 'number') {
					throw new Error('setSlot requires two numbers (slotId, value)')
				}

				// Only allow slot 1 or 2
				if (slotId !== 1 && slotId !== 2) {
					throw new Error('setSlot: slotId must be 1 or 2')
				}

				// Store value in level data
				const levelData = world.resources.levelData
				if (!levelData) {
					throw new Error('Level data not initialized')
				}

				if (slotId === 1) {
					levelData.slot1 = value
				} else {
					levelData.slot2 = value
				}

				return true
			}
		},
		ui: { displayName: '💾 setSlot' },
	},
	{
		fullName: 'game::getSlot',
		params: { slotId: 'number' },
		returns: 'number',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 0
			}
			const { world } = ctx
			return (slotId: Value) => {
				if (typeof slotId !== 'number') {
					throw new Error('getSlot requires a number (slotId)')
				}

				// Only allow slot 1 or 2
				if (slotId !== 1 && slotId !== 2) {
					throw new Error('getSlot: slotId must be 1 or 2')
				}

				// Get value from level data
				const levelData = world.resources.levelData
				if (!levelData) {
					return 0
				}

				if (slotId === 1) {
					return typeof levelData.slot1 === 'number' ? levelData.slot1 : 0
				} else {
					return typeof levelData.slot2 === 'number' ? levelData.slot2 : 0
				}
			}
		},
		ui: { displayName: '📤 getSlot' },
	},
	{
		fullName: 'game::clearSlots',
		params: {},
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world } = ctx
			return () => {
				// Clear all slots in level data
				const levelData = world.resources.levelData
				if (levelData) {
					levelData.slot1 = null
					levelData.slot2 = null
				}
				return true
			}
		},
		ui: { displayName: '🗑️ clearSlots' },
	},
	{
		fullName: 'game::conditionalDeflectOnPlate',
		params: { plateColor: 'string', trueAngle: 'number', falseAngle: 'number', delayMs: 'number' },
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => true
			}
			const { world, casterEid } = ctx
			return (plateColor: Value, trueAngle: Value, falseAngle: Value, delayMs: Value) => {
				if (typeof plateColor !== 'string') {
					throw new Error('conditionalDeflectOnPlate requires plateColor to be a string (RED or YELLOW)')
				}
				if (typeof trueAngle !== 'number' || typeof falseAngle !== 'number') {
					throw new Error('conditionalDeflectOnPlate requires trueAngle and falseAngle to be numbers')
				}
				if (typeof delayMs !== 'number') {
					throw new Error('conditionalDeflectOnPlate requires delayMs to be a number')
				}

				// Check current player plate color
				const currentPlate = world.resources.currentPlateColor || 'NONE'
				const angle = currentPlate === plateColor ? trueAngle : falseAngle

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
					throw new Error('No fireball found to deflect')
				}

				// Set time-based deflection
				FireballStats.pendingDeflection[mostRecentEid] = angle
				FireballStats.deflectAtTime[mostRecentEid] = Date.now() + delayMs

				console.log(`[conditionalDeflectOnPlate] Player on ${currentPlate}, deflecting ${angle}° after ${delayMs}ms`)
				return true
			}
		},
		ui: { displayName: '🔀 conditionalDeflectOnPlate' },
	},
	{
		fullName: 'game::detectTreasure',
		params: {},
		returns: 'boolean',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => false
			}
			const { world } = ctx
			return () => {
				// Get player position
				const playerBody = world.resources.bodies.get(world.resources.playerEid)
				if (!playerBody) {
					return false
				}

				// Get chests from level data (Level6 specific)
				const levelData = world.resources.levelData
				if (!levelData || !levelData.chests || !Array.isArray(levelData.chests)) {
					return false
				}

				const chests = levelData.chests as Array<{
					x: number
					y: number
					item?: boolean
				}>
				const detectionDistance = levelData.chestOpenDistance || 30

				// Find the nearest chest within detection distance
				let nearestChest: { item?: boolean } | null = null
				let nearestDistance = detectionDistance

				for (const chest of chests) {
					const dx = chest.x - playerBody.x
					const dy = chest.y - playerBody.y
					const distance = Math.sqrt(dx * dx + dy * dy)

					if (distance < nearestDistance) {
						nearestDistance = distance
						nearestChest = chest
					}
				}

				// Return true if nearest chest contains treasure, false if bomb or no chest found
				return nearestChest ? (nearestChest.item === true) : false
			}
		},
		ui: { displayName: '💎 detectTreasure' },
	},
	{
		fullName: 'game::getLightColor',
		params: { id: 'number' },
		returns: 'string',
		getFn: (evaluator) => {
			const ctx = getRuntimeContext(evaluator)
			if (!ctx) {
				return () => 'green'
			}
			const { world } = ctx
			return (id: Value) => {
				if (typeof id !== 'number') {
					throw new Error('getLightColor requires a number (light ID)')
				}

				// Get lights from level data
				const levelData = world.resources.levelData
				if (!levelData || !levelData.lights || !Array.isArray(levelData.lights)) {
					throw new Error('Lights not found in level data')
				}

				const lights = levelData.lights as Array<{
					ID: number
					color: 'green' | 'red' | 'yellow'
				}>

				// Find light by ID
				const light = lights.find(l => l.ID === id)
				if (!light) {
					throw new Error(`Light with ID ${id} not found`)
				}

				return light.color.toUpperCase() // Return 'GREEN', 'RED', or 'YELLOW'
			}
		},
		ui: { displayName: '💡 getLightColor' },
	},
	]
}

