import { query } from 'bitecs'
import type { GameWorld } from '../gameWorld'
import { Enemy, Health, Sprite } from '../components'
import type { TriggerConfig, TriggerType } from '../resources'
import { castSpell } from '../spells/castSpell'

/**
 * 触发器系统 - 检查触发器条件并执行法术
 */
export function triggerSystem(world: GameWorld) {
	const now = Date.now()
	const triggers = Array.from(world.resources.triggers.values())

	for (const trigger of triggers) {
		if (!trigger.active) {
			continue
		}

		let shouldTrigger = false

		switch (trigger.type) {
			case 'onEnemyNearby': {
				shouldTrigger = checkEnemyNearby(world, trigger)
				break
			}
			case 'onTimeInterval': {
				shouldTrigger = checkTimeInterval(now, trigger)
				break
			}
			case 'onPlayerHurt': {
				shouldTrigger = checkPlayerHurt(world, trigger)
				break
			}
			case 'onEnemyKilled': {
				shouldTrigger = checkEnemyKilled(world, trigger)
				break
			}
			case 'onPlayerLowHealth': {
				shouldTrigger = checkPlayerLowHealth(world, trigger)
				break
			}
		}

		if (shouldTrigger) {
			// 执行法术
			try {
				castSpell(world, trigger.casterEid, trigger.spell)
				trigger.lastTriggerTime = now

				// 对于一次性触发器，执行后移除
				if (trigger.type === 'onPlayerHurt' || trigger.type === 'onEnemyKilled') {
					// 这些触发器在触发后需要重置状态，以便下次检测
					if (trigger.type === 'onPlayerHurt') {
						// 更新生命值记录，避免重复触发
						const playerEid = world.resources.playerEid
						trigger.lastHealth = Health.current[playerEid]
					}
				}
			} catch (err) {
				console.error(`[TriggerSystem] Error executing trigger ${trigger.id}:`, err)
			}
		}
	}
}

/**
 * 检查敌人是否在附近
 */
function checkEnemyNearby(world: GameWorld, trigger: TriggerConfig): boolean {
	const casterBody = world.resources.bodies.get(trigger.casterEid)
	if (!casterBody) {
		return false
	}

	const distance = trigger.params.distance || 200
	const distanceSq = distance * distance

	// 查找附近的敌人
	for (const eid of query(world, [Enemy, Sprite])) {
		const enemyBody = world.resources.bodies.get(eid)
		if (!enemyBody) {
			continue
		}

		const dx = enemyBody.x - casterBody.x
		const dy = enemyBody.y - casterBody.y
		const distSq = dx * dx + dy * dy

		if (distSq <= distanceSq) {
			return true
		}
	}

	return false
}

/**
 * 检查时间间隔
 */
function checkTimeInterval(now: number, trigger: TriggerConfig): boolean {
	const interval = trigger.params.intervalMs || 1000
	return now - trigger.lastTriggerTime >= interval
}

/**
 * 检查玩家是否受伤
 */
function checkPlayerHurt(world: GameWorld, trigger: TriggerConfig): boolean {
	const playerEid = world.resources.playerEid
	const currentHealth = Health.current[playerEid]

	// 首次检查，记录初始生命值
	if (trigger.lastHealth === undefined) {
		trigger.lastHealth = currentHealth
		return false
	}

	// 如果生命值下降，触发
	if (currentHealth < trigger.lastHealth) {
		trigger.lastHealth = currentHealth
		return true
	}

	trigger.lastHealth = currentHealth
	return false
}

/**
 * 检查敌人是否被击杀
 */
function checkEnemyKilled(world: GameWorld, trigger: TriggerConfig): boolean {
	// 这个触发器需要在敌人死亡时触发
	// 由于死亡系统会立即移除实体，我们需要在死亡系统中触发
	// 这里暂时返回 false，实际触发逻辑在 deathSystem 中处理
	return false
}

/**
 * 检查玩家生命值是否低于阈值
 */
function checkPlayerLowHealth(world: GameWorld, trigger: TriggerConfig): boolean {
	const playerEid = world.resources.playerEid
	const currentHealth = Health.current[playerEid]
	const maxHealth = Health.max[playerEid]
	const threshold = trigger.params.healthThreshold || 0.3

	if (maxHealth === 0) {
		return false
	}

	const healthRatio = currentHealth / maxHealth
	return healthRatio <= threshold
}
