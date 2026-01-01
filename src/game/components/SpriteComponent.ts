import Phaser from 'phaser'
import { Component } from '../core/Component'

export class SpriteComponent extends Component {
	private scene: Phaser.Scene
	readonly body: Phaser.Physics.Arcade.Image

	constructor(scene: Phaser.Scene, body: Phaser.Physics.Arcade.Image) {
		super()
		this.scene = scene
		this.body = body
	}

	update() {}

	flash(durationMs = 80, tint = 0xff4444) {
		this.body.setTint(tint)
		this.scene.time.delayedCall(durationMs, () => {
			if (this.body.active) {
				this.body.clearTint()
			}
		})
	}

	playAttack() {
		this.scene.tweens.add({
			targets: this.body,
			scaleX: 1.15,
			scaleY: 1.15,
			yoyo: true,
			duration: 80,
			ease: 'Quad.easeOut',
		})
	}

	setVelocity(x: number, y: number) {
		this.body.setVelocity(x, y)
	}

	getX() {
		return this.body.x
	}

	getY() {
		return this.body.y
	}

	destroy() {
		this.body.destroy()
	}
}



