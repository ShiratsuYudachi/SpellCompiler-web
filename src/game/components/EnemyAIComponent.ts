import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import type Phaser from 'phaser'
import { areaAttack } from '../areaAttack'
import { SpriteComponent } from './SpriteComponent'

export class EnemyAIComponent extends Component {
	private scene: Phaser.Scene
	private self: Entity
	private target: Entity
	private nextAt = 0
	private speed = 140
	private engageRange = 40
	private attackRadius = 40
	private attackDamage = 5
	private cooldownMs = 1000

	constructor(scene: Phaser.Scene, self: Entity, target: Entity) {
		super()
		this.scene = scene
		this.self = self
		this.target = target
	}

	update() {
		const selfSprite = this.self.get(SpriteComponent)
		const targetSprite = this.target.get(SpriteComponent)
		if (!selfSprite || !targetSprite) {
			return
		}

		const dx = targetSprite.getX() - selfSprite.getX()
		const dy = targetSprite.getY() - selfSprite.getY()
		const dist = Math.sqrt(dx * dx + dy * dy) || 1

		if (dist <= this.engageRange) {
			selfSprite.setVelocity(0, 0)
			const now = Date.now()
			if (now < this.nextAt) {
				return
			}
			this.nextAt = now + this.cooldownMs

			areaAttack(
				this.self,
				this.attackRadius,
				this.attackDamage,
				this.scene as Phaser.Scene & { getEntities(): Entity[] },
				{ x: selfSprite.getX(), y: selfSprite.getY() },
			)
			return
		}

		selfSprite.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
	}
}

