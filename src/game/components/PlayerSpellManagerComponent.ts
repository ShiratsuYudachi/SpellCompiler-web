import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import { SpellCasterComponent } from './SpellCasterComponent'
import type { CompiledSpell } from '../spells/types'

export class PlayerSpellManagerComponent extends Component {
	private self: Entity
	private spell: CompiledSpell | null = null
	lastMessage = ''

	constructor(self: Entity) {
		super()
		this.self = self
	}

	update(_dt: number) {}

	setSpell(spell: CompiledSpell) {
		this.spell = spell
		this.lastMessage = 'Spell equipped. Press 1 to cast.'
	}

	cast() {
		if (!this.spell) {
			this.lastMessage = 'No spell equipped.'
			return
		}

		const caster = this.self.get(SpellCasterComponent)
		if (!caster) {
			this.lastMessage = 'SpellCasterComponent not found.'
			return
		}

		try {
			const result = caster.cast(this.spell)
			this.lastMessage = `Spell result: ${JSON.stringify(result)}`
		} catch (err) {
			this.lastMessage = `Spell error: ${err instanceof Error ? err.message : String(err)}`
		}
	}
}


