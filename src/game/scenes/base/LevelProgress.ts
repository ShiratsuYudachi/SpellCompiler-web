/**
 * LevelProgress - Level progression management
 * Now integrated with SaveManager for persistence
 */

import { SaveManager } from '../../../storage/SaveManager'

export interface LevelProgressData {
	unlockedLevels: number[]
	completedLevels: number[]
	currentLevel: number
}

export class LevelProgress {
	private static data: LevelProgressData = {
		unlockedLevels: [1],
		completedLevels: [],
		currentLevel: 1,
	}

	/**
	 * Initialize (load from save file)
	 */
	static init() {
		// Load from current save file
		const saveData = SaveManager.getCurrentSaveData()
		if (saveData) {
			this.data = saveData.levelProgress
			console.log('[LevelProgress] Loaded from save file')
		}
	}

	/**
	 * Save to save file
	 */
	static save() {
		SaveManager.updateCurrentSaveData({ levelProgress: this.data })
	}

	/**
	 * Check if level is unlocked
	 */
	static isLevelUnlocked(level: number): boolean {
		return this.data.unlockedLevels.includes(level)
	}

	/**
	 * Check if level is completed
	 */
	static isLevelCompleted(level: number): boolean {
		return this.data.completedLevels.includes(level)
	}

	/**
	 * Unlock level
	 */
	static unlockLevel(level: number) {
		if (!this.data.unlockedLevels.includes(level)) {
			this.data.unlockedLevels.push(level)
			this.save()
		}
	}

	/**
	 * Complete level (auto-unlock next level)
	 */
	static completeLevel(level: number) {
		if (!this.data.completedLevels.includes(level)) {
			this.data.completedLevels.push(level)
		}

		// Unlock next level
		const nextLevel = level + 1
		if (nextLevel <= 20) {
			this.unlockLevel(nextLevel)
		}

		this.save()
	}

	/**
	 * Get unlocked levels list
	 */
	static getUnlockedLevels(): number[] {
		return [...this.data.unlockedLevels]
	}

	/**
	 * Get completed levels list
	 */
	static getCompletedLevels(): number[] {
		return [...this.data.completedLevels]
	}

	/**
	 * Reset progress (for development)
	 */
	static reset() {
		this.data = {
			unlockedLevels: [1],
			completedLevels: [],
			currentLevel: 1,
		}
		this.save()
	}

	/**
	 * Unlock all levels (for development)
	 */
	static unlockAll() {
		this.data.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1)
		this.save()
	}
}

// Auto-initialize
LevelProgress.init()
