import { query } from 'bitecs'
import { Health, Sprite } from '../../components'
import type { GameWorld } from '../../world'
import { flashBody } from './flash'

export function areaAttack(
	world: GameWorld,
	attackerEid: number,
	location: { x: number; y: number },
	radius: number,
	damage: number,
) {
	const ring = world.resources.scene.add.circle(location.x, location.y, radius, 0xffffff, 0.25)
	ring.setDepth(50)
	ring.setScale(0.2)
	world.resources.scene.tweens.add({
		targets: ring,
		scale: 1,
		alpha: 0,
		duration: 150,
		onComplete: () => ring.destroy(),
	})

	areaDamage(world, attackerEid, location, radius, damage)
}

export function areaDamage(
	world: GameWorld,
	attackerEid: number,
	location: { x: number; y: number },
	radius: number,
	damage: number,
) {
	const { x, y } = location

	for (const targetEid of query(world, [Sprite, Health])) {
		if (targetEid === attackerEid) {
			continue
		}

		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			continue
		}

		const dx = body.x - x
		const dy = body.y - y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > radius) {
			continue
		}

		applyDamage(world, targetEid, damage)
	}
}

export function applyDamage(world: GameWorld, targetEid: number, damage: number) {
	const before = Health.current[targetEid]
	Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage)
	if (Health.current[targetEid] !== before) {
		const body = world.resources.bodies.get(targetEid)
		if (body) {
			flashBody(world.resources.scene, body)
		}
	}
}


