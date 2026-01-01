import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../world'
import { Velocity } from '../components'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
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

		const targetEid = entityId === 'player' ? world.resources.playerEid : casterEid
		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			throw new Error('Sprite not found')
		}

		const x = body.x + dx
		const y = body.y + dy
		Velocity.x[targetEid] = 0
		Velocity.y[targetEid] = 0
		body.setVelocity(0, 0)
		body.setPosition(x, y)
		return [x, y]
	})

	for (const fn of spell.dependencies || []) {
		evaluator.registerFunction(fn)
	}

	return evaluator.run(spell.ast)
}



