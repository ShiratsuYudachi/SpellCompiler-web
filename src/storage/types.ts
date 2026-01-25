/**
 * Save File System Types
 * 
 * All game data is stored in a single SaveFile object
 */

import type { StoredSpell } from '../editor/utils/spellStorage'
import type { EventBinding } from '../game/events/EventQueue'

/**
 * Complete save file containing all game state
 */
export interface SaveFile {
	// Metadata
	id: string
	name: string
	createdAt: number
	lastSaved: number
	version: string
	
	// Game data
	data: SaveData
}

/**
 * All game data that needs to be saved
 */
export interface SaveData {
	// Level progression
	levelProgress: {
		unlockedLevels: number[]
		completedLevels: number[]
		currentLevel: number
	}
	
	// Player-created spells
	spells: StoredSpell[]
	
	// Event bindings (key bindings, custom events)
	eventBindings: EventBinding[]
	
	// Game settings
	settings: {
		// Future: volume, difficulty, etc.
	}
}

/**
 * Minimal save file info for listing
 */
export interface SaveFileInfo {
	id: string
	name: string
	createdAt: number
	lastSaved: number
	version: string
	currentLevel: number
}
