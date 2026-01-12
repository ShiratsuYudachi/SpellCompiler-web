import { Evaluator } from '../ast/evaluator'
import { registerFunctionSpecs } from '../library/types'
import { gameFunctions } from '../library/game'

let done = false

export function ensureBuiltinFunctionsRegistered() {
	if (done) return
	done = true

	const evaluator = new Evaluator()
	registerFunctionSpecs(evaluator, gameFunctions)
}


