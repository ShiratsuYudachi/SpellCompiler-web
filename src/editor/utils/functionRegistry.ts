export type ParameterMode = 'literal-xy' | 'vector' | 'default'

export type ParameterModeOption = {
	mode: ParameterMode
	label: string
	params: string[]
}

export type FunctionUiMeta = {
	displayName?: string
	description?: string
	hidden?: boolean
}

export type RegisteredFunctionInfo = {
	fullName: string
	params: string[]
	ui?: FunctionUiMeta
	parameterModes?: Record<string, ParameterModeOption[]>
}

type RegistryEntry = {
	fullName: string
	parts: string[]
	rootNamespace: string
	displayName: string
	params: string[]
	ui?: FunctionUiMeta
	parameterModes?: Record<string, ParameterModeOption[]>
}

const byFullName = new Map<string, RegistryEntry>()

function splitFullName(fullName: string): string[] {
	return fullName.split('::').filter(Boolean)
}

function getDefaultDisplayName(fullName: string): string {
	const parts = splitFullName(fullName)
	return parts[parts.length - 1] || fullName
}

export function registerUiFunction(info: RegisteredFunctionInfo) {
	const parts = splitFullName(info.fullName)
	const rootNamespace = parts[0] || 'user'
	const displayName = info.ui?.displayName || getDefaultDisplayName(info.fullName)

	byFullName.set(info.fullName, {
		fullName: info.fullName,
		parts,
		rootNamespace,
		displayName,
		params: info.params,
		ui: info.ui,
		parameterModes: info.parameterModes,
	})
}

export function getFunctionInfo(fullName: string) {
	return byFullName.get(fullName)
}

export function listFunctions(allowed?: RegExp) {
	const re = allowed ? new RegExp(allowed.source, allowed.flags.replace(/g|y/g, '')) : null
	return Array.from(byFullName.values()).filter((f) => {
		if (f.ui?.hidden) return false
		if (!re) return true
		return re.test(f.fullName)
	})
}

export type FunctionTreeNode =
	| { type: 'group'; name: string; path: string[]; children: FunctionTreeNode[] }
	| { type: 'function'; fullName: string; displayName: string; params: string[]; ui?: FunctionUiMeta }

export function getFunctionTree(allowed?: RegExp): FunctionTreeNode[] {
	const root = new Map<string, { name: string; path: string[]; children: Map<string, any>; functions: any[] }>()

	for (const fn of listFunctions(allowed)) {
		const parts = fn.parts
		if (parts.length === 0) continue

		const ns = parts[0]
		const pathParts = parts.slice(1, -1)
		const leafName = parts[parts.length - 1]

		let nsNode = root.get(ns)
		if (!nsNode) {
			nsNode = { name: ns, path: [ns], children: new Map(), functions: [] }
			root.set(ns, nsNode)
		}

		let current = nsNode
		for (const p of pathParts) {
			let child = current.children.get(p)
			if (!child) {
				child = { name: p, path: [...current.path, p], children: new Map(), functions: [] }
				current.children.set(p, child)
			}
			current = child
		}

		current.functions.push({
			fullName: fn.fullName,
			displayName: fn.ui?.displayName || leafName,
			params: fn.params,
			ui: fn.ui,
		})
	}

	function finalize(node: { name: string; path: string[]; children: Map<string, any>; functions: any[] }): FunctionTreeNode {
		const childrenGroups = Array.from(node.children.values())
			.sort((a, b) => a.name.localeCompare(b.name))
			.map(finalize)

		const childrenFns: FunctionTreeNode[] = node.functions
			.sort((a: any, b: any) => a.displayName.localeCompare(b.displayName))
			.map((f: any) => ({
				type: 'function',
				fullName: f.fullName,
				displayName: f.displayName,
				params: f.params,
				ui: f.ui,
			}))

		return {
			type: 'group',
			name: node.name,
			path: node.path,
			children: [...childrenGroups, ...childrenFns],
		}
	}

	return Array.from(root.values())
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(finalize)
}


