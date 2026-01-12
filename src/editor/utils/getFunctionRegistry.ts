import { ensureBuiltinFunctionsRegistered } from './ensureBuiltinFunctionsRegistered'
import { getFunctionInfo as getRegFunctionInfo, getFunctionTree, listFunctions, type FunctionTreeNode, type ParameterMode, type ParameterModeOption } from './functionRegistry'

export type { ParameterMode, ParameterModeOption, FunctionTreeNode }

export interface FunctionInfo {
	name: string
	displayName: string
	namespace: string
	paramCount: number
	params: string[]
	isNative: boolean
	parameterModes?: Record<string, ParameterModeOption[]>
}

function parseRootNamespace(fullName: string) {
	return fullName.split('::')[0] || 'user'
}

function parseDisplayName(fullName: string) {
	const parts = fullName.split('::').filter(Boolean)
	return parts[parts.length - 1] || fullName
}

export function parseFunctionName(fullName: string): { namespace: string; displayName: string } {
	return { namespace: parseRootNamespace(fullName), displayName: parseDisplayName(fullName) }
}

export function getFunctionRegistry(): FunctionInfo[] {
	ensureBuiltinFunctionsRegistered()
	return listFunctions().map((f) => ({
		name: f.fullName,
		displayName: f.ui?.displayName || parseDisplayName(f.fullName),
		namespace: parseRootNamespace(f.fullName),
		paramCount: f.params.length,
		params: f.params,
		isNative: true,
		parameterModes: f.parameterModes,
	}))
}

export function getFunctionsByNamespace(): Record<string, FunctionInfo[]> {
	const functions = getFunctionRegistry()
	const grouped: Record<string, FunctionInfo[]> = {}
	for (const fn of functions) {
		if (!grouped[fn.namespace]) grouped[fn.namespace] = []
		grouped[fn.namespace].push(fn)
	}
	return grouped
}

export function getFunctionInfo(fullName: string): FunctionInfo | undefined {
	ensureBuiltinFunctionsRegistered()
	const reg = getRegFunctionInfo(fullName)
	if (!reg) return undefined
	return {
		name: reg.fullName,
		displayName: reg.displayName,
		namespace: reg.rootNamespace,
		paramCount: reg.params.length,
		params: reg.params,
		isNative: true,
		parameterModes: reg.parameterModes,
	}
}

export function getFunctionTreeForMenu(): FunctionTreeNode[] {
	ensureBuiltinFunctionsRegistered()
	return getFunctionTree()
}
