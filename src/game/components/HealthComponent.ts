import { Component } from '../core/Component'

export class HealthComponent extends Component {
	max: number
	current: number
	private onDamage?: (amount: number) => void

	constructor(max: number, onDamage?: (amount: number) => void) {
		super()
		this.max = max
		this.current = max
		this.onDamage = onDamage
	}

	update() {}

	takeDamage(amount: number) {
		const before = this.current
		this.current = Math.max(0, this.current - amount)
		if (this.current !== before) {
			this.onDamage?.(amount)
		}
	}

	isDead() {
		return this.current <= 0
	}
}



