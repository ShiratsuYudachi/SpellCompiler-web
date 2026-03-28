import type { Spell } from '../ast/ast'
import { flowToIR } from './flowToIR'
import { SaveManager } from '../../storage/SaveManager'

export type SpellMeta = {
	id: string
	name: string
	savedAt: number
	hasCompiledAST: boolean  // Indicates if the spell has successfully compiled AST
	/** True when the last explicit compile attempt failed (graph existed but flowToIR threw). */
	compilationFailed?: boolean
}

export type StoredSpell = SpellMeta & {
	flow: unknown
	compiledSpell?: Spell  // Optional: only present if compilation succeeded
	viewport?: { x: number; y: number; zoom: number }  // Optional: editor viewport (camera position/zoom)
}

export function listSpells(): SpellMeta[] {
	// Load spells from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return []
	
	return saveData.spells.map(s => ({
		id: s.id,
		name: s.name,
		savedAt: s.savedAt,
		hasCompiledAST: s.hasCompiledAST,
		compilationFailed: s.compilationFailed ?? false,
	})).sort((a, b) => b.savedAt - a.savedAt)
}

export function loadSpell(id: string): StoredSpell | null {
	// Load spell from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return null
	
	const spell = saveData.spells.find(s => s.id === id)
	return spell || null
}

/**
 * Compare flows by semantic graph only. React Flow adds runtime fields (width, height,
 * selected, measured, …) that make JSON.stringify differ from stored snapshots.
 */
function stableFlowFingerprint(flow: unknown): string {
	const f = flow as { nodes?: any[]; edges?: any[] }
	if (!f?.nodes || !f?.edges) return ''
	const normNode = (n: any) => ({
		id: n.id,
		type: n.type,
		position: n.position,
		data: n.data,
		...(n.parentNode != null ? { parentNode: n.parentNode } : {}),
	})
	const normEdge = (e: any) => ({
		id: e.id,
		source: e.source,
		target: e.target,
		sourceHandle: e.sourceHandle,
		targetHandle: e.targetHandle,
		...(e.type != null ? { type: e.type } : {}),
	})
	const nodes = [...f.nodes]
		.map(normNode)
		.sort((a, b) => String(a.id).localeCompare(String(b.id)))
	const edges = [...f.edges]
		.map(normEdge)
		.sort((a, b) => String(a.id).localeCompare(String(b.id)))
	return JSON.stringify({ nodes, edges })
}

export function deleteSpell(id: string) {
	// Delete from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return
	
	const newSpells = saveData.spells.filter(s => s.id !== id)
	SaveManager.updateCurrentSaveData({ spells: newSpells })
}

export function upsertSpell(params: {
	id?: string | null
	name: string
	flow: unknown
	viewport?: { x: number; y: number; zoom: number }
	/**
	 * When false, persist the flow only (no flowToIR). If the graph matches the
	 * previously stored flow, existing compiled AST is kept; otherwise AST is cleared.
	 * Auto-save uses this to avoid compiling on every keystroke / editor entry.
	 */
	compile?: boolean
}): { id: string; hasCompiledAST: boolean; compiledSpell?: Spell; compilationFailed: boolean } {
	const now = Date.now()
	const id = params.id || `spell-${now}`
	const shouldCompile = params.compile !== false
	const existing = loadSpell(id)

	if (shouldCompile) {
		const flow = params.flow as { nodes: any[]; edges: any[] }
		const attempted = !!(flow && flow.nodes && flow.edges)
		let compiledAST: Spell | undefined = undefined
		let hasCompiledAST = false

		try {
			if (attempted) {
				compiledAST = flowToIR(flow.nodes, flow.edges)
				hasCompiledAST = true
				console.log(`[spellStorage] Successfully compiled spell ${id}`)
			}
		} catch (err) {
			console.warn(`[spellStorage] Failed to compile spell ${id}:`, err)
		}

		const compilationFailed = attempted && !hasCompiledAST

		const spell: StoredSpell = {
			id,
			name: params.name,
			savedAt: now,
			hasCompiledAST,
			compilationFailed,
			flow: params.flow,
			compiledSpell: compiledAST,
			viewport: params.viewport ?? existing?.viewport,
		}

		const saveData = SaveManager.getCurrentSaveData()
		if (!saveData) {
			console.error('[spellStorage] No current save data')
			return { id, hasCompiledAST, compiledSpell: compiledAST, compilationFailed }
		}

		const spells = saveData.spells.filter((s) => s.id !== id)
		spells.push(spell)
		SaveManager.updateCurrentSaveData({ spells })

		return { id, hasCompiledAST, compiledSpell: compiledAST, compilationFailed }
	}

	// Persist flow without compiling; keep prior AST only if the graph is unchanged
	let compiledSpell: Spell | undefined
	let hasCompiledAST = false
	let compilationFailed = false
	const newFlow = params.flow as { nodes: any[]; edges: any[] }
	const sameFlow =
		existing &&
		stableFlowFingerprint(newFlow) === stableFlowFingerprint(existing.flow)
	if (sameFlow && existing!.compiledSpell) {
		compiledSpell = existing!.compiledSpell
		hasCompiledAST = existing!.hasCompiledAST
		compilationFailed = false
	} else if (sameFlow) {
		compilationFailed = existing!.compilationFailed ?? false
	} else {
		compilationFailed = false
	}

	const spell: StoredSpell = {
		id,
		name: params.name,
		savedAt: now,
		hasCompiledAST,
		compilationFailed,
		flow: params.flow,
		compiledSpell,
		viewport: params.viewport ?? existing?.viewport,
	}

	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) {
		console.error('[spellStorage] No current save data')
		return { id, hasCompiledAST, compiledSpell, compilationFailed }
	}

	const spells = saveData.spells.filter((s) => s.id !== id)
	spells.push(spell)
	SaveManager.updateCurrentSaveData({ spells })

	return { id, hasCompiledAST, compiledSpell, compilationFailed }
}

// Viewport state (camera position/zoom) is now stored directly in spell data
export function saveViewport(spellId: string, viewport: { x: number; y: number; zoom: number }) {
	const spell = loadSpell(spellId)
	if (!spell) {
		console.warn(`[spellStorage] Cannot save viewport: spell ${spellId} not found`)
		return
	}
	
	// Update spell with new viewport (no re-compile; graph unchanged)
	upsertSpell({
		id: spellId,
		name: spell.name,
		flow: spell.flow,
		viewport: viewport,
		compile: false,
	})
}

export function loadViewport(spellId: string): { x: number; y: number; zoom: number } | null {
	const spell = loadSpell(spellId)
	return spell?.viewport || null
}

export function duplicateSpell(id: string, newName?: string): string | null {
	const spell = loadSpell(id)
	if (!spell) return null

	const name = newName || `Copy of ${spell.name}`
	// New ID: persist flow only — do not compile until the user builds (compile: false).
	const { id: newId } = upsertSpell({
		name: name,
		flow: spell.flow,
		viewport: spell.viewport,
		compile: false,
	})

	return newId
}

/**
 * Get compiled spell AST if available
 * Returns null if spell doesn't exist or compilation failed
 */
export function getCompiledSpell(spellId: string): Spell | null {
	const spell = loadSpell(spellId)
	if (!spell) {
		return null
	}
	
	// Return pre-compiled AST if available
	if (spell.compiledSpell) {
		return spell.compiledSpell
	}
	
	// No compiled AST available
	return null
}


