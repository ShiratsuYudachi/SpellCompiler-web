import { Component } from '../core/Component'
import type { InputSystem } from '../core/InputSystem'
import type Phaser from 'phaser'
import type { Entity } from '../core/Entity'
import { areaAttack } from '../areaAttack'
import { SpriteComponent } from './SpriteComponent'

export class PlayerAttackInputComponent extends Component {
	private scene: Phaser.Scene
	private input: InputSystem
	private player: Entity
	private nextAt = 0
	private radius = 70
	private damage = 15
	private cooldownMs = 1000

	constructor(scene: Phaser.Scene, input: InputSystem, player: Entity) {
		super()
		this.scene = scene
		this.input = input
		this.player = player
	}

	update() {
		if (!this.input.isAttackPressed()) {
			return
		}

		const now = Date.now()
		if (now < this.nextAt) {
			return
		}
		this.nextAt = now + this.cooldownMs

		const playerSprite = this.player.get(SpriteComponent)
		if (!playerSprite) {
			return
		}

		areaAttack(
			this.player,
			this.radius,
			this.damage,
			this.scene as Phaser.Scene & { getEntities(): Entity[] },
			{ x: playerSprite.getX(), y: playerSprite.getY() },
		)
	}
}

