import { Component } from '../core/Component'
import type { InputSystem } from '../core/InputSystem'
import type { SpriteComponent } from './SpriteComponent'

export class PlayerMoveComponent extends Component {
	private input: InputSystem
	private sprite: SpriteComponent
	private speed: number

	constructor(input: InputSystem, sprite: SpriteComponent, speed: number) {
		super()
		this.input = input
		this.sprite = sprite
		this.speed = speed
	}

	update() {
		const { x, y } = this.input.getMoveAxis()
		this.sprite.setVelocity(x * this.speed, y * this.speed)
	}
}



