import type { Evaluator } from './evaluator';
import { registerFunctionSpecs } from '../library/types'
import { coreLibraryFunctions } from '../library/core'
import { registerVectorFunctions } from '../library/vector'
import { registerListFunctions } from '../library/list'

/**
 * Register all core library functions to an evaluator
 * Includes: math, logic, string, vector, list, etc.
 */
export function registerCoreLibrary(evaluator: Evaluator): void {
	registerFunctionSpecs(evaluator, coreLibraryFunctions)
	registerVectorFunctions(evaluator)
	registerListFunctions(evaluator)
}

