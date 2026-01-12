import type { FunctionSpec } from './types'
import { mathFunctions } from './math'
import { logicFunctions } from './logic'
import { listFunctions } from './list'
import { vectorFunctions } from './vector'
import { fnFunctions } from './fn'
import { stringFunctions } from './string'

export const coreLibraryFunctions: FunctionSpec[] = [
	...mathFunctions,
	...logicFunctions,
	...listFunctions,
	...vectorFunctions,
	...fnFunctions,
	...stringFunctions,
]


