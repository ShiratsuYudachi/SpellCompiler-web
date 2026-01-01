import { query } from 'bitecs'
import { Enemy, EnemyAI, Sprite, Velocity } from '../components'
import type { GameWorld } from '../world'
import { areaAttack } from './utils/attack'

export function enemyAISystem(world: GameWorld) {
	for (const eid of query(world, [Enemy, EnemyAI, Sprite, Velocity])) {
		const targetEid = EnemyAI.targetEid[eid]
		const selfBody = world.resources.bodies.get(eid)
		const targetBody = world.resources.bodies.get(targetEid)
		if (!selfBody || !targetBody) {
			continue
		}

		const dx = targetBody.x - selfBody.x
		const dy = targetBody.y - selfBody.y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1

		if (dist <= EnemyAI.engageRange[eid]) {
			Velocity.x[eid] = 0
			Velocity.y[eid] = 0

			const now = Date.now()
			if (now < EnemyAI.nextAt[eid]) {
				continue
			}
			EnemyAI.nextAt[eid] = now + EnemyAI.cooldownMs[eid]

			areaAttack(
				world,
				eid,
				{ x: selfBody.x, y: selfBody.y },
				EnemyAI.attackRadius[eid],
				EnemyAI.attackDamage[eid],
			)
			continue
		}

		const speed = EnemyAI.speed[eid]
		Velocity.x[eid] = (dx / dist) * speed
		Velocity.y[eid] = (dy / dist) * speed
	}
}


