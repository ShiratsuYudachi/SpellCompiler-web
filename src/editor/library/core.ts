import type { FunctionSpec } from './types'
import { mathFunctions } from './math'
import { logicFunctions } from './logic'
import { fnFunctions } from './fn'
import { stringFunctions } from './string'

// Note: Vector and List are now registered via registerVectorFunctions/registerListFunctions
// in library.ts, not as FunctionSpecs

export const coreLibraryFunctions: FunctionSpec[] = [
	...mathFunctions,
	...logicFunctions,
	...fnFunctions,
	...stringFunctions,
]


