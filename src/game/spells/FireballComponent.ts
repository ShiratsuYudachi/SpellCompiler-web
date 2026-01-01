import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import { HealthComponent } from '../components/HealthComponent'
import { SpriteComponent } from '../components/SpriteComponent'
import type Phaser from 'phaser'

export class FireballComponent extends Component {
	private scene: Phaser.Scene & { getEntities(): Entity[] }
	private self: Entity
	private owner: Entity
	private sprite: SpriteComponent
	private damage: number
	private hitRadius: number
	private bornAt = Date.now()
	private lifetimeMs: number

	constructor(
		scene: Phaser.Scene & { getEntities(): Entity[] },
		self: Entity,
		owner: Entity,
		sprite: SpriteComponent,
		vx: number,
		vy: number,
		speed: number,
		damage: number,
		hitRadius: number,
		lifetimeMs: number,
	) {
		super()
		this.scene = scene
		this.self = self
		this.owner = owner
		this.sprite = sprite
		this.damage = damage
		this.hitRadius = hitRadius
		this.lifetimeMs = lifetimeMs
		this.sprite.setVelocity(vx * speed, vy * speed)
	}

	update(_dt: number) {
		if (!this.self.isActive()) {
			return
		}

		if (Date.now() - this.bornAt > this.lifetimeMs) {
			this.self.destroy()
			return
		}

		const x = this.sprite.getX()
		const y = this.sprite.getY()

		for (const target of this.scene.getEntities()) {
			if (!target.isActive() || target === this.self || target === this.owner) {
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
			if (dist > this.hitRadius) {
				continue
			}

			targetHealth.takeDamage(this.damage)
			this.self.destroy()
			return
		}
	}
}


