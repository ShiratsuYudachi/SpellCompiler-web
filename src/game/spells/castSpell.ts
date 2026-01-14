import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { setGameRuntimeContext, getGameFunctions } from '../../editor/library/game'
import { registerFunctionSpecs } from '../../editor/library/types'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
	console.log('[castSpell] Starting spell cast')
	console.log('[castSpell] casterEid:', casterEid)
	console.log('[castSpell] spell.ast:', JSON.stringify(spell.ast, null, 2))
	console.log('[castSpell] spell.dependencies:', spell.dependencies)

	const evaluator = new Evaluator()
	setGameRuntimeContext(evaluator, world, casterEid, spell)
	registerFunctionSpecs(evaluator, getGameFunctions())

	for (const fn of spell.dependencies || []) {
		console.log('[castSpell] Registering dependency function:', fn.name)
		evaluator.registerFunction(fn)
	}

	try {
		const result = evaluator.run(spell.ast)
		console.log('[castSpell] Spell result:', result)
		return result
	} catch (err) {
		console.error('[castSpell] Spell error:', err)
		throw err
	}
}



