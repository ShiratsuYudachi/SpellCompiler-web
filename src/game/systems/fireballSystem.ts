import { query } from 'bitecs'
import { Direction, Fireball, FireballStats, Health, Lifetime, Owner, Sprite, Velocity } from '../components'
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

		// Deflection system: check if projectile should deflect
		const deflectAngle = FireballStats.pendingDeflection[eid]
		if (deflectAngle !== 0) {
			const deflectTime = FireballStats.deflectAtTime[eid]
			const now = Date.now()

			if (now >= deflectTime) {
				// Calculate current direction angle
				const currentAngle = Math.atan2(Direction.y[eid], Direction.x[eid])
				// Add deflection angle (convert degrees to radians)
				const newAngle = currentAngle + (deflectAngle * Math.PI / 180)

				// Update direction components
				Direction.x[eid] = Math.cos(newAngle)
				Direction.y[eid] = Math.sin(newAngle)

				// Update velocity based on new direction
				const speed = FireballStats.speed[eid]
				Velocity.x[eid] = Direction.x[eid] * speed
				Velocity.y[eid] = Direction.y[eid] * speed

				// Clear deflection flag
				FireballStats.pendingDeflection[eid] = 0

				// Visual feedback: briefly tint the fireball
				body.setTint(0x00ff00)
				setTimeout(() => {
					if (body && body.active) {
						body.clearTint()
					}
				}, 100)
			}
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


