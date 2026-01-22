import { query } from 'bitecs'
import { Direction, Fireball, FireballStats, Health, Lifetime, Owner, Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'
import { despawnEntity } from '../gameWorld'
import { applyDamage } from './utils/attack'
import { onDeflectionExecuted } from '../../editor/library/game'

// Helper: check which plate color the fireball is over
function getFireballPlateColor(world: GameWorld, x: number, y: number): number {
	for (const plate of world.resources.pressurePlates) {
		const bounds = plate.rect.getBounds()
		if (x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom) {
			if (plate.color === 'RED') return 1
			if (plate.color === 'YELLOW') return 2
		}
	}
	return 0 // NONE
}

// Helper: apply deflection to fireball
function applyDeflection(world: GameWorld, eid: number, angle: number) {
	const body = world.resources.bodies.get(eid)
	if (!body) return

	// Calculate current direction angle
	const currentAngle = Math.atan2(Direction.y[eid], Direction.x[eid])
	// Add deflection angle (convert degrees to radians)
	const newAngle = currentAngle + (angle * Math.PI / 180)

	// Update direction components
	Direction.x[eid] = Math.cos(newAngle)
	Direction.y[eid] = Math.sin(newAngle)

	// Update velocity based on new direction
	const speed = FireballStats.speed[eid]
	Velocity.x[eid] = Direction.x[eid] * speed
	Velocity.y[eid] = Direction.y[eid] * speed

	// Visual feedback: briefly tint the fireball
	body.setTint(0x00ff00)
	setTimeout(() => {
		if (body && body.active) {
			body.clearTint()
		}
	}, 100)

	console.log(`[Fireball] Deflected by ${angle}° at position (${body.x.toFixed(0)}, ${body.y.toFixed(0)})`)
}

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

		// Wall collision detection: destroy fireball if it hits a wall
		let hitWall = false
		for (const wall of world.resources.walls) {
			const bounds = wall.getBounds()
			if (
				body.x > bounds.left &&
				body.x < bounds.right &&
				body.y > bounds.top &&
				body.y < bounds.bottom
			) {
				hitWall = true
				break
			}
		}
		if (hitWall) {
			despawnEntity(world, eid)
			continue
		}

		// Plate-based deflection: check if fireball is over a pressure plate
		const expectedPlateColor = FireballStats.deflectOnPlateColor[eid]
		if (expectedPlateColor !== 0 && FireballStats.plateDeflected[eid] === 0) {
			const currentPlateColor = getFireballPlateColor(world, body.x, body.y)
			if (currentPlateColor === expectedPlateColor) {
				const angle = FireballStats.deflectOnPlateAngle[eid]
				applyDeflection(world, eid, angle)
				FireballStats.plateDeflected[eid] = 1 // Mark as deflected
			}
		}

		// Time-based deflection system: check if projectile should deflect
		const deflectAngle = FireballStats.pendingDeflection[eid]
		if (deflectAngle !== 0) {
			const deflectTime = FireballStats.deflectAtTime[eid]
			const now = Date.now()

			if (now >= deflectTime) {
				applyDeflection(world, eid, deflectAngle)
				// Clear deflection flag and process next deflection from queue
				onDeflectionExecuted(eid)
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


