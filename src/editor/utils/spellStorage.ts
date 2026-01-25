import type { Spell } from '../ast/ast'

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

const INDEX_KEY = 'spellcompiler:spells:index'
const SPELL_KEY_PREFIX = 'spellcompiler:spells:'

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

function readIndex(): SpellMeta[] {
	const data = readJson<SpellMeta[]>(localStorage.getItem(INDEX_KEY))
	if (!data || !Array.isArray(data)) return []
	return data
}

function writeIndex(index: SpellMeta[]) {
	writeJson(INDEX_KEY, index)
}

export function listSpells(): SpellMeta[] {
	return readIndex().slice().sort((a, b) => b.savedAt - a.savedAt)
}

export function loadSpell(id: string): StoredSpell | null {
	const key = `${SPELL_KEY_PREFIX}${id}`
	const data = readJson<StoredSpell>(localStorage.getItem(key))
	if (!data || data.id !== id) return null
	return data
}

export function deleteSpell(id: string) {
	localStorage.removeItem(`${SPELL_KEY_PREFIX}${id}`)
	const nextIndex = readIndex().filter((m) => m.id !== id)
	writeIndex(nextIndex)
}

export function upsertSpell(params: { id?: string | null; name: string; flow: unknown }): string {
	const now = Date.now()
	const id = params.id || `spell-${now}`
	
	// Try to compile the flow to AST
	let compiledAST: Spell | undefined = undefined
	let hasCompiledAST = false
	
	try {
		// Import flowToIR dynamically to avoid circular dependency
		const { flowToIR } = require('./flowToIR')
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

	writeJson(`${SPELL_KEY_PREFIX}${id}`, spell)

	const index = readIndex()
	const existing = index.find((m) => m.id === id)
	if (existing) {
		existing.name = spell.name
		existing.savedAt = spell.savedAt
		existing.hasCompiledAST = hasCompiledAST
		writeIndex(index)
		return id
	}

	writeIndex([{ id: spell.id, name: spell.name, savedAt: spell.savedAt, hasCompiledAST }, ...index])
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


