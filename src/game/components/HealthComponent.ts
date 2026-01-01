import { Component } from '../core/Component'

export class HealthComponent extends Component {
	max: number
	current: number

	constructor(max: number) {
		super()
		this.max = max
		this.current = max
	}

	update() {}

	takeDamage(amount: number) {
		this.current = Math.max(0, this.current - amount)
	}

	isDead() {
		return this.current <= 0
	}
}



