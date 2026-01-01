import { Component } from '../core/Component'
import type { Entity } from '../core/Entity'
import { SpriteComponent } from './SpriteComponent'
import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from '../spells/types'

export class SpellCasterComponent extends Component {
	private self: Entity

	constructor(self: Entity) {
		super()
		this.self = self
	}

	update(_dt: number) {}

	cast(spell: CompiledSpell) {
		const evaluator = new Evaluator()

		evaluator.registerNativeFunctionFullName('game::getPlayer', [], () => {
			return 'player'
		})

		evaluator.registerNativeFunctionFullName('game::teleportRelative', ['entityId', 'dx', 'dy'], (entityId, dx, dy) => {
			if (entityId !== 'self' && entityId !== 'player') {
				throw new Error(`Unknown entityId: ${String(entityId)}`)
			}
			if (typeof dx !== 'number' || typeof dy !== 'number') {
				throw new Error('teleportRelative requires numbers')
			}

			const sprite = this.self.get(SpriteComponent)
			if (!sprite) {
				throw new Error('Sprite not found')
			}

			const x = sprite.getX() + dx
			const y = sprite.getY() + dy
			sprite.setVelocity(0, 0)
			sprite.setPosition(x, y)
			return [x, y]
		})

		for (const fn of spell.dependencies || []) {
			evaluator.registerFunction(fn)
		}

		return evaluator.run(spell.ast)
	}
}


