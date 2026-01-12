import { query } from 'bitecs'
import { Enemy, Health } from '../components'
import type { GameWorld } from '../gameWorld'
import { despawnEntity } from '../gameWorld'
import { castSpell } from '../spells/castSpell'

export function deathSystem(world: GameWorld) {
	for (const eid of query(world, [Enemy, Health])) {
		if ((Health.current[eid] || 0) <= 0) {
			// 触发所有 onEnemyKilled 触发器
			for (const trigger of world.resources.triggers.values()) {
				if (trigger.active && trigger.type === 'onEnemyKilled') {
					try {
						castSpell(world, trigger.casterEid, trigger.spell)
					} catch (err) {
						console.error(`[DeathSystem] Error executing onEnemyKilled trigger ${trigger.id}:`, err)
					}
				}
			}

			despawnEntity(world, eid)
		}
	}
}


