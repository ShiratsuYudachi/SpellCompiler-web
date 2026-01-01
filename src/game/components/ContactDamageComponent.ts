import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import { SpriteComponent } from './SpriteComponent'
import { HealthComponent } from './HealthComponent'

export class ContactDamageComponent extends Component {
	private attacker: Entity
	private victim: Entity
	private cooldownMs: number
	private damage: number
	private range: number
	private nextAt = 0

	constructor(attacker: Entity, victim: Entity, range: number, damage: number, cooldownMs: number) {
		super()
		this.attacker = attacker
		this.victim = victim
		this.range = range
		this.damage = damage
		this.cooldownMs = cooldownMs
	}

	update() {
		const attackerSprite = this.attacker.get(SpriteComponent)
		const victimSprite = this.victim.get(SpriteComponent)
		const victimHealth = this.victim.get(HealthComponent)

		if (!attackerSprite || !victimSprite || !victimHealth) {
			return
		}

		const now = Date.now()
		if (now < this.nextAt) {
			return
		}

		const dx = victimSprite.getX() - attackerSprite.getX()
		const dy = victimSprite.getY() - attackerSprite.getY()
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > this.range) {
			return
		}

		this.nextAt = now + this.cooldownMs
		victimHealth.takeDamage(this.damage)
		victimSprite.flash()
	}
}


