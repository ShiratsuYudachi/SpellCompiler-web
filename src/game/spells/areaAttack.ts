import Phaser from 'phaser'
import type { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'

export type AttackLocation = {
	x: number
	y: number
}

export function areaDamage(
	attacker: Entity,
	radius: number,
	damage: number,
	scene: Phaser.Scene & { getEntities(): Entity[] },
	location: AttackLocation,
) {
	const { x, y } = location

	for (const target of scene.getEntities()) {
		if (target === attacker || !target.isActive()) {
			continue
		}

		const targetSprite = target.get(SpriteComponent)
		const targetHealth = target.get(HealthComponent)
		if (!targetSprite || !targetHealth) {
			continue
		}

		const dx = targetSprite.getX() - x
		const dy = targetSprite.getY() - y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > radius) {
			continue
		}

		targetHealth.takeDamage(damage)
	}
}

export function areaAttack(
	attacker: Entity,
	radius: number,
	damage: number,
	scene: Phaser.Scene & { getEntities(): Entity[] },
	location: AttackLocation,
) {
	const ring = scene.add.circle(location.x, location.y, radius, 0xffffff, 0.25)
	ring.setDepth(50)
	ring.setScale(0.2)
	scene.tweens.add({
		targets: ring,
		scale: 1,
		alpha: 0,
		duration: 150,
		onComplete: () => ring.destroy(),
	})

	areaDamage(attacker, radius, damage, scene, location)
}


