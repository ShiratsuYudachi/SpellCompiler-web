import { Evaluator } from '../ast/evaluator'
import { registerFunctionSpecs } from '../library/types'
import { getGameFunctions } from '../library/game'

let done = false

export function ensureBuiltinFunctionsRegistered() {
	if (done) return
	done = true

	const evaluator = new Evaluator()
	registerFunctionSpecs(evaluator, getGameFunctions())
}


