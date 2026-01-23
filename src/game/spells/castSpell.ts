import { Evaluator } from '../../editor/ast/evaluator'
import type { CompiledSpell } from './types'
import type { GameWorld } from '../gameWorld'
import { GameStateManager } from '../state/GameStateManager'
import { registerGameFunctions } from '../../editor/library/game'
import { setGameStateManager } from '../../editor/library/game'
import type { GameState, Value } from '../../editor/ast/ast'

/**
 * Cast a spell with given arguments
 * @param world - Game world
 * @param casterEid - Entity casting the spell
 * @param spell - Compiled spell
 * @param args - Arguments to pass to the spell (first arg is always GameState in game context)
 */
export function castSpell(
	world: GameWorld, 
	casterEid: number, 
	spell: CompiledSpell,
	args?: Value[]
) {
	console.log('[castSpell] Starting spell cast')
	console.log('[castSpell] casterEid:', casterEid)
	console.log('[castSpell] spell.params:', spell.params)
	console.log('[castSpell] spell.body:', JSON.stringify(spell.body, null, 2))
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

	// Create initial GameState to inject as first argument
	const initialState: GameState = {
		type: 'gamestate',
		__runtimeRef: Symbol('GameState')
	}

	// Prepare arguments: first is always GameState, then any additional args
	const spellArgs = args ? [initialState, ...args] : [initialState]
	
	// Validate argument count
	const expectedParamCount = spell.params.length
	const providedArgCount = spellArgs.length
	
	if (providedArgCount < expectedParamCount) {
		throw new Error(
			`Spell requires ${expectedParamCount} parameter(s) but only ${providedArgCount} provided. ` +
			`Expected: [${spell.params.join(', ')}]`
		)
	}

	try {
		// Create environment with injected arguments
		const env = new Map<string, Value>()
		spell.params.forEach((paramName, index) => {
			if (index < spellArgs.length) {
				env.set(paramName, spellArgs[index])
				console.log(`[castSpell] Injecting param '${paramName}' =`, spellArgs[index])
			}
		})
		
		// Run spell with injected environment
		const result = evaluator.run(spell.body, env)
		console.log('[castSpell] Spell result:', result)
		return result
	} catch (err) {
		console.error('[castSpell] Spell error:', err)
		throw err
	}
}
