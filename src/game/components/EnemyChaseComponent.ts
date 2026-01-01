import { Component } from '../core/Component'
import type { SpriteComponent } from './SpriteComponent'

export class EnemyChaseComponent extends Component {
	private enemy: SpriteComponent
	private target: SpriteComponent
	private speed: number

	constructor(enemy: SpriteComponent, target: SpriteComponent, speed: number) {
		super()
		this.enemy = enemy
		this.target = target
		this.speed = speed
	}

	update() {
		const dx = this.target.getX() - this.enemy.getX()
		const dy = this.target.getY() - this.enemy.getY()
		const dist = Math.sqrt(dx * dx + dy * dy) || 1
		this.enemy.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed)
	}
}



