import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { registerGameFunctionsForRuntime } from './registerGameFunctions'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
	const evaluator = new Evaluator()
	registerGameFunctionsForRuntime(evaluator, world, casterEid, spell)

	for (const fn of spell.dependencies || []) {
		evaluator.registerFunction(fn)
	}

	return evaluator.run(spell.ast)
}



