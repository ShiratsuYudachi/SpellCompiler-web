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

export function upsertSpell(params: { 
	id?: string | null
	name: string
	flow: unknown
	viewport?: { x: number; y: number; zoom: number }
}): string {
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
		compiledSpell: compiledAST,
		viewport: params.viewport
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

// Viewport state (camera position/zoom) is now stored directly in spell data
export function saveViewport(spellId: string, viewport: { x: number; y: number; zoom: number }) {
	const spell = loadSpell(spellId)
	if (!spell) {
		console.warn(`[spellStorage] Cannot save viewport: spell ${spellId} not found`)
		return
	}
	
	// Update spell with new viewport
	upsertSpell({
		id: spellId,
		name: spell.name,
		flow: spell.flow,
		viewport: viewport
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
	// upsertSpell will generate a new ID and handle compilation
	// Viewport is automatically included in the spell data
	const newId = upsertSpell({
		name: name,
		flow: spell.flow,
		viewport: spell.viewport
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


