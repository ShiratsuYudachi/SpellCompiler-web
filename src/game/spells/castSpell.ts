import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { GameStateManager } from '../state/GameStateManager'
import { registerGameFunctions } from '../../editor/library/game'
import { setGameStateManager } from '../../editor/library/game'
import type { GameState } from '../../editor/ast/ast'

export function castSpell(world: GameWorld, casterEid: number, spell: CompiledSpell) {
	console.log('[castSpell] Starting spell cast')
	console.log('[castSpell] casterEid:', casterEid)
	console.log('[castSpell] spell.ast:', JSON.stringify(spell.ast, null, 2))
	console.log('[castSpell] spell.dependencies:', spell.dependencies)

	const evaluator = new Evaluator()
	
	// Create state manager and inject into library
	const stateManager = new GameStateManager(world, casterEid)
	setGameStateManager(stateManager)
	
	// Register game functions
	registerGameFunctions(evaluator)
	
	// Register spell's custom functions
	for (const fn of spell.dependencies || []) {
		console.log('[castSpell] Registering dependency function:', fn.name)
		evaluator.registerFunction(fn)
	}

	// Create initial GameState to inject
	const initialState: GameState = {
		type: 'gamestate',
		__runtimeRef: Symbol('GameState')
	}

	try {
		// Create environment with injected GameState
		const env = new Map<string, any>()
		env.set('state', initialState)
		
		// Run spell with injected environment
		const result = evaluator.run(spell.ast, env)
		console.log('[castSpell] Spell result:', result)
		return result
	} catch (err) {
		console.error('[castSpell] Spell error:', err)
		throw err
	}
}
