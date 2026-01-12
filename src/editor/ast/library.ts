import type { Evaluator } from './evaluator';
import { registerFunctionSpecs } from '../library/types'
import { coreLibraryFunctions } from '../library/core'

/**
 * Register all core library functions to an evaluator
 * 
 */
export function registerCoreLibrary(evaluator: Evaluator): void {
	registerFunctionSpecs(evaluator, coreLibraryFunctions)
}

