import type { Spell } from '../ast/ast'
import { flowToIR } from './flowToIR'
import { SaveManager } from '../../storage/SaveManager'

export type SpellMeta = {
	id: string
	name: string
	savedAt: number
	hasCompiledAST: boolean  // Indicates if the spell has successfully compiled AST
}

export type StoredSpell = SpellMeta & {
	flow: unknown
	compiledSpell?: Spell  // Optional: only present if compilation succeeded
}

function readJson<T>(raw: string | null): T | null {
	if (!raw) return null
	try {
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

function writeJson(key: string, value: unknown) {
	localStorage.setItem(key, JSON.stringify(value))
}

export function listSpells(): SpellMeta[] {
	// Load spells from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return []
	
	return saveData.spells.map(s => ({
		id: s.id,
		name: s.name,
		savedAt: s.savedAt,
		hasCompiledAST: s.hasCompiledAST
	})).sort((a, b) => b.savedAt - a.savedAt)
}

export function loadSpell(id: string): StoredSpell | null {
	// Load spell from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return null
	
	const spell = saveData.spells.find(s => s.id === id)
	return spell || null
}

export function deleteSpell(id: string) {
	// Delete from current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) return
	
	const newSpells = saveData.spells.filter(s => s.id !== id)
	SaveManager.updateCurrentSaveData({ spells: newSpells })
}

export function upsertSpell(params: { id?: string | null; name: string; flow: unknown }): string {
	const now = Date.now()
	const id = params.id || `spell-${now}`
	
	// Try to compile the flow to AST
	let compiledAST: Spell | undefined = undefined
	let hasCompiledAST = false
	
	try {
		const flow = params.flow as { nodes: any[], edges: any[] }
		
		if (flow && flow.nodes && flow.edges) {
			compiledAST = flowToIR(flow.nodes, flow.edges)
			hasCompiledAST = true
			console.log(`[spellStorage] Successfully compiled spell ${id}`)
		}
	} catch (err) {
		console.warn(`[spellStorage] Failed to compile spell ${id}:`, err)
		// Continue saving without compiled AST
	}
	
	const spell: StoredSpell = { 
		id, 
		name: params.name, 
		savedAt: now, 
		hasCompiledAST,
		flow: params.flow,
		compiledSpell: compiledAST
	}

	// Save to current save file
	const saveData = SaveManager.getCurrentSaveData()
	if (!saveData) {
		console.error('[spellStorage] No current save data')
		return id
	}
	
	const spells = saveData.spells.filter(s => s.id !== id)
	spells.push(spell)
	SaveManager.updateCurrentSaveData({ spells })
	
	return id
}

// UI State storage for library mode (preserves node positions, zoom, etc.)
const UI_STATE_KEY_PREFIX = 'spellcompiler:ui-state:'

export type UIState = {
	nodes: any[]
	edges: any[]
	viewport?: { x: number; y: number; zoom: number }
	timestamp: number
}

export function saveUIState(spellId: string, state: UIState) {
	const key = `${UI_STATE_KEY_PREFIX}${spellId}`
	writeJson(key, state)
}

export function loadUIState(spellId: string): UIState | null {
	const key = `${UI_STATE_KEY_PREFIX}${spellId}`
	return readJson<UIState>(localStorage.getItem(key))
}

export function deleteUIState(spellId: string) {
	const key = `${UI_STATE_KEY_PREFIX}${spellId}`
	localStorage.removeItem(key)
}

export function duplicateSpell(id: string, newName?: string): string | null {
	const spell = loadSpell(id)
	if (!spell) return null

	const name = newName || `Copy of ${spell.name}`
	// upsertSpell will generate a new ID and handle compilation
	const newId = upsertSpell({
		name: name,
		flow: spell.flow
	})

	// Also duplicate UI state if it exists
	const uiState = loadUIState(id)
	if (uiState) {
		saveUIState(newId, uiState)
	}

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


