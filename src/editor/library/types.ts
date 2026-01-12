import type { Evaluator } from '../ast/evaluator'
import type { FunctionUiMeta, ParameterModeOption } from '../utils/functionRegistry'

export type ParamType =
	| 'number'
	| 'string'
	| 'boolean'
	| 'value'
	| 'vector2d'
	| 'list'
	| 'function'

export type FunctionSpec = {
	fullName: string
	params: Record<string, ParamType>
	returns: ParamType
	fn?: (...args: any[]) => any
	getFn?: (evaluator: Evaluator) => (...args: any[]) => any
	ui?: FunctionUiMeta
	parameterModes?: Record<string, ParameterModeOption[]>
}

export function registerFunctionSpecs(evaluator: Evaluator, specs: readonly FunctionSpec[]) {
	for (const spec of specs) {
		const fn = spec.fn || spec.getFn?.(evaluator)
		if (!fn) {
			throw new Error(`FunctionSpec missing fn/getFn: ${spec.fullName}`)
		}
		evaluator.registerFunction({
			fullName: spec.fullName,
			params: Object.keys(spec.params),
			fn,
			ui: spec.ui,
			parameterModes: spec.parameterModes,
		})
	}
}


