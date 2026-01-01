import Phaser from 'phaser'
import { Component } from '../core/Component'
import type { InputSystem } from '../core/InputSystem'
import type { Entity } from '../core/Entity'
import { SpriteComponent } from './SpriteComponent'
import { HealthComponent } from './HealthComponent'

export class PlayerAttackComponent extends Component {
	private scene: Phaser.Scene
	private input: InputSystem
	private selfSprite: SpriteComponent
	private target: Entity
	private range: number
	private damage: number

	constructor(
		scene: Phaser.Scene,
		input: InputSystem,
		selfSprite: SpriteComponent,
		target: Entity,
		range: number,
		damage: number,
	) {
		super()
		this.scene = scene
		this.input = input
		this.selfSprite = selfSprite
		this.target = target
		this.range = range
		this.damage = damage
	}

	update() {
		if (!this.input.isAttackPressed()) {
			return
		}

		const targetSprite = this.target.get(SpriteComponent)
		const targetHealth = this.target.get(HealthComponent)
		if (!targetSprite || !targetHealth) {
			return
		}

		const dx = targetSprite.getX() - this.selfSprite.getX()
		const dy = targetSprite.getY() - this.selfSprite.getY()
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > this.range) {
			return
		}

		targetHealth.takeDamage(this.damage)
		targetSprite.body.setTint(0xffffff)
		this.scene.time.delayedCall(80, () => {
			if (targetSprite.body.active) {
				targetSprite.body.clearTint()
			}
		})
	}
}


