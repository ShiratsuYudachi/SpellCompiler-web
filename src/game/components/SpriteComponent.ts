import Phaser from 'phaser'
import { Component } from '../core/Component'

export class SpriteComponent extends Component {
	readonly body: Phaser.Physics.Arcade.Image

	constructor(body: Phaser.Physics.Arcade.Image) {
		super()
		this.body = body
	}

	update() {}

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



