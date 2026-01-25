/**
 * SaveManager - Central save file management
 * 
 * Provides a simple game-like save system:
 * - Create new save files
 * - Load/save game state
 * - List all saves
 * - Delete saves
 * 
 * All game data (spells, event bindings, progress) is stored in a single SaveFile object
 */

import type { SaveFile, SaveFileInfo, SaveData } from './types'

const SAVE_VERSION = '1.0.0'
const SAVE_LIST_KEY = 'spellcompiler:savefiles:list'
const SAVE_FILE_PREFIX = 'spellcompiler:savefiles:'
const CURRENT_SAVE_KEY = 'spellcompiler:savefiles:current'

class SaveManagerClass {
	private currentSaveId: string | null = null
	private currentSave: SaveFile | null = null
	
	/**
	 * Initialize save manager - run on app start
	 */
	init(): void {
		// Load current save ID
		const savedId = localStorage.getItem(CURRENT_SAVE_KEY)
		if (savedId) {
			const save = this.loadSaveFile(savedId)
			if (save) {
				this.currentSaveId = savedId
				this.currentSave = save
				console.log(`[SaveManager] Loaded save: ${save.name}`)
			}
		}
		
		// If no current save, check if any saves exist
		const saves = this.listAllSaves()
		if (saves.length === 0) {
			// No saves exist, create default save
			console.log('[SaveManager] No saves found, creating default save')
			this.createNewSave('Default Save')
		} else if (!this.currentSave) {
			// Saves exist but none loaded, load the most recent
			const mostRecent = saves.sort((a, b) => b.lastSaved - a.lastSaved)[0]
			const save = this.loadSaveFile(mostRecent.id)
			if (save) {
				this.currentSaveId = mostRecent.id
				this.currentSave = save
				localStorage.setItem(CURRENT_SAVE_KEY, mostRecent.id)
				console.log(`[SaveManager] Loaded most recent save: ${save.name}`)
			}
		}
	}
	
	/**
	 * Create a new save file
	 */
	createNewSave(name: string): string {
		const now = Date.now()
		const id = `save-${now}`
		
		const saveFile: SaveFile = {
			id,
			name,
			createdAt: now,
			lastSaved: now,
			version: SAVE_VERSION,
			data: {
				levelProgress: {
					unlockedLevels: [1],
					completedLevels: [],
					currentLevel: 1
				},
				spells: [],
				eventBindings: [],
				settings: {}
			}
		}
		
		// Save to storage
		this.writeSaveFile(saveFile)
		
		// Add to save list
		const list = this.getSaveList()
		list.push(id)
		this.writeSaveList(list)
		
		// Set as current save
		this.currentSaveId = id
		this.currentSave = saveFile
		localStorage.setItem(CURRENT_SAVE_KEY, id)
		
		console.log(`[SaveManager] Created new save: ${name}`)
		return id
	}
	
	/**
	 * Load a save file and set it as current
	 */
	loadSaveFile(id: string): SaveFile | null {
		const key = `${SAVE_FILE_PREFIX}${id}`
		const raw = localStorage.getItem(key)
		if (!raw) return null
		
		try {
			const save = JSON.parse(raw) as SaveFile
			if (save.id !== id) return null
			
			this.currentSaveId = id
			this.currentSave = save
			localStorage.setItem(CURRENT_SAVE_KEY, id)
			
			return save
		} catch (err) {
			console.error(`[SaveManager] Failed to load save ${id}:`, err)
			return null
		}
	}
	
	/**
	 * Save current game state to current save file
	 */
	saveCurrentGame(): void {
		if (!this.currentSave) {
			console.warn('[SaveManager] No current save to save to')
			return
		}
		
		this.currentSave.lastSaved = Date.now()
		this.writeSaveFile(this.currentSave)
		console.log(`[SaveManager] Saved game: ${this.currentSave.name}`)
	}
	
	/**
	 * Get current save file
	 */
	getCurrentSave(): SaveFile | null {
		return this.currentSave
	}
	
	/**
	 * Get current save data
	 */
	getCurrentSaveData(): SaveData | null {
		return this.currentSave?.data || null
	}
	
	/**
	 * Update current save data
	 */
	updateCurrentSaveData(updates: Partial<SaveData>): void {
		if (!this.currentSave) {
			console.warn('[SaveManager] No current save to update')
			return
		}
		
		this.currentSave.data = {
			...this.currentSave.data,
			...updates
		}
		this.saveCurrentGame()
	}
	
	/**
	 * List all save files
	 */
	listAllSaves(): SaveFileInfo[] {
		const list = this.getSaveList()
		const saves: SaveFileInfo[] = []
		
		for (const id of list) {
			const save = this.readSaveFile(id)
			if (save) {
				saves.push({
					id: save.id,
					name: save.name,
					createdAt: save.createdAt,
					lastSaved: save.lastSaved,
					version: save.version,
					currentLevel: save.data.levelProgress.currentLevel
				})
			}
		}
		
		return saves.sort((a, b) => b.lastSaved - a.lastSaved)
	}
	
	/**
	 * Delete a save file
	 */
	deleteSave(id: string): void {
		// Remove from list
		const list = this.getSaveList()
		const newList = list.filter(sid => sid !== id)
		this.writeSaveList(newList)
		
		// Remove from storage
		const key = `${SAVE_FILE_PREFIX}${id}`
		localStorage.removeItem(key)
		
		// If this was the current save, clear it
		if (this.currentSaveId === id) {
			this.currentSaveId = null
			this.currentSave = null
			localStorage.removeItem(CURRENT_SAVE_KEY)
		}
		
		console.log(`[SaveManager] Deleted save: ${id}`)
	}
	
	/**
	 * Export save file as JSON string (for backup/sharing)
	 */
	exportSave(id: string): string | null {
		const save = this.readSaveFile(id)
		if (!save) return null
		return JSON.stringify(save, null, 2)
	}
	
	/**
	 * Import save file from JSON string
	 */
	importSave(jsonString: string): string | null {
		try {
			const save = JSON.parse(jsonString) as SaveFile
			
			// Generate new ID to avoid conflicts
			const now = Date.now()
			save.id = `save-${now}`
			save.lastSaved = now
			
			// Save it
			this.writeSaveFile(save)
			
			// Add to list
			const list = this.getSaveList()
			list.push(save.id)
			this.writeSaveList(list)
			
			console.log(`[SaveManager] Imported save: ${save.name}`)
			return save.id
		} catch (err) {
			console.error('[SaveManager] Failed to import save:', err)
			return null
		}
	}
	
	// ===== Private Methods =====
	
	private getSaveList(): string[] {
		const raw = localStorage.getItem(SAVE_LIST_KEY)
		if (!raw) return []
		try {
			const list = JSON.parse(raw)
			return Array.isArray(list) ? list : []
		} catch {
			return []
		}
	}
	
	private writeSaveList(list: string[]): void {
		localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(list))
	}
	
	private readSaveFile(id: string): SaveFile | null {
		const key = `${SAVE_FILE_PREFIX}${id}`
		const raw = localStorage.getItem(key)
		if (!raw) return null
		try {
			return JSON.parse(raw) as SaveFile
		} catch {
			return null
		}
	}
	
	private writeSaveFile(save: SaveFile): void {
		const key = `${SAVE_FILE_PREFIX}${save.id}`
		localStorage.setItem(key, JSON.stringify(save))
	}
}

// Global singleton
export const SaveManager = new SaveManagerClass()

// Auto-initialize
SaveManager.init()
