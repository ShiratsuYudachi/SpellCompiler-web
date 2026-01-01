import { query } from 'bitecs'
import { Fireball, FireballStats, Health, Lifetime, Owner, Sprite } from '../components'
import type { GameWorld } from '../gameWorld'
import { despawnEntity } from '../gameWorld'
import { applyDamage } from './utils/attack'

export function fireballSystem(world: GameWorld, _dt: number) {
	for (const eid of query(world, [Fireball, Sprite, FireballStats, Owner, Lifetime])) {
		const body = world.resources.bodies.get(eid)
		if (!body) {
			despawnEntity(world, eid)
			continue
		}

		if (Date.now() - Lifetime.bornAt[eid] > Lifetime.lifetimeMs[eid]) {
			despawnEntity(world, eid)
			continue
		}

		const ownerEid = Owner.eid[eid]
		const hitRadius = FireballStats.hitRadius[eid]

		for (const targetEid of query(world, [Sprite, Health])) {
			if (targetEid === eid || targetEid === ownerEid) {
				continue
			}

			const targetBody = world.resources.bodies.get(targetEid)
			if (!targetBody) {
				continue
			}

			const dx = targetBody.x - body.x
			const dy = targetBody.y - body.y
			const dist = Math.sqrt(dx * dx + dy * dy)
			if (dist > hitRadius) {
				continue
			}

			applyDamage(world, targetEid, FireballStats.damage[eid])
			despawnEntity(world, eid)
			break
		}
	}
}


