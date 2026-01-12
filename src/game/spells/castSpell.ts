import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { setGameRuntimeContext, gameFunctions } from '../../editor/library/game'
import { registerFunctionSpecs } from '../../editor/library/types'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
	const evaluator = new Evaluator()
	setGameRuntimeContext(evaluator, world, casterEid, spell)
	registerFunctionSpecs(evaluator, gameFunctions)

	for (const fn of spell.dependencies || []) {
		evaluator.registerFunction(fn)
	}

	return evaluator.run(spell.ast)
}



