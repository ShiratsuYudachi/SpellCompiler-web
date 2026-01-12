import { Evaluator } from '../ast/evaluator'
import { registerGameFunctionsForPreview } from '../../game/spells/registerGameFunctions'

let done = false

export function ensureBuiltinFunctionsRegistered() {
	if (done) return
	done = true

	const evaluator = new Evaluator()
	registerGameFunctionsForPreview(evaluator)
}


