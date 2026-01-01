import Phaser from 'phaser'
import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import { areaAttack } from '../areaAttack'
import { spawnFireball } from '../spawnFireball'
import type { SpriteComponent } from './SpriteComponent'

export class PlayerControlComponent extends Component {
	private scene: Phaser.Scene & { getEntities(): Entity[] }
	private player: Entity
	private sprite: SpriteComponent

	private cursors: Phaser.Types.Input.Keyboard.CursorKeys
	private keys: Record<string, Phaser.Input.Keyboard.Key>
	private meleeKey: Phaser.Input.Keyboard.Key

	private moveSpeed = 220

	private meleeRadius = 70
	private meleeDamage = 15
	private meleeCooldownMs = 1000
	private nextMeleeAt = 0

	private fireballCooldownMs = 300
	private nextFireballAt = 0
	private fireballQueued = false
	private fireballTargetX = 0
	private fireballTargetY = 0

	private onPointerDown = (pointer: Phaser.Input.Pointer) => {
		if (pointer.button !== 0) {
			return
		}
		this.fireballQueued = true
		this.fireballTargetX = pointer.worldX
		this.fireballTargetY = pointer.worldY
	}

	constructor(scene: Phaser.Scene & { getEntities(): Entity[] }, player: Entity, sprite: SpriteComponent) {
		super()
		this.scene = scene
		this.player = player
		this.sprite = sprite

		this.cursors = scene.input.keyboard!.createCursorKeys()
		this.keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
		this.meleeKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

		scene.input.on('pointerdown', this.onPointerDown)
	}

	update() {
		this.updateMove()
		this.updateMelee()
		this.updateFireball()
	}

	destroy() {
		this.scene.input.off('pointerdown', this.onPointerDown)
	}

	private updateMove() {
		let x = 0
		let y = 0

		if (this.cursors.left?.isDown || this.keys.A.isDown) x -= 1
		if (this.cursors.right?.isDown || this.keys.D.isDown) x += 1
		if (this.cursors.up?.isDown || this.keys.W.isDown) y -= 1
		if (this.cursors.down?.isDown || this.keys.S.isDown) y += 1

		if (x !== 0 || y !== 0) {
			const len = Math.sqrt(x * x + y * y)
			x /= len
			y /= len
		}

		this.sprite.setVelocity(x * this.moveSpeed, y * this.moveSpeed)
	}

	private updateMelee() {
		if (!Phaser.Input.Keyboard.JustDown(this.meleeKey)) {
			return
		}

		const now = Date.now()
		if (now < this.nextMeleeAt) {
			return
		}
		this.nextMeleeAt = now + this.meleeCooldownMs

		this.sprite.playAttack()
		areaAttack(
			this.player,
			this.meleeRadius,
			this.meleeDamage,
			this.scene,
			{ x: this.sprite.getX(), y: this.sprite.getY() },
		)
	}

	private updateFireball() {
		if (!this.fireballQueued) {
			return
		}

		const now = Date.now()
		if (now < this.nextFireballAt) {
			return
		}
		this.nextFireballAt = now + this.fireballCooldownMs
		this.fireballQueued = false

		const x = this.sprite.getX()
		const y = this.sprite.getY()
		const dx = this.fireballTargetX - x
		const dy = this.fireballTargetY - y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1

		spawnFireball(this.scene, this.player, x, y, dx / dist, dy / dist)
	}
}

