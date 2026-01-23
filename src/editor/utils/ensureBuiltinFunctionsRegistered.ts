import { Evaluator } from '../ast/evaluator'
import { registerGameFunctions } from '../library/game'

let done = false

export function ensureBuiltinFunctionsRegistered() {
	if (done) return
	done = true

	const evaluator = new Evaluator()
	registerGameFunctions(evaluator)
}


