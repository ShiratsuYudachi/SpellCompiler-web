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

		// Unlock next level (skip missing levels 5 and 10)
		let nextLevel = level + 1
		if (nextLevel === 5) nextLevel = 6
		if (nextLevel === 10) nextLevel = 11
		if (nextLevel <= 31) {
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
		// All real levels: 1-4, 6-9, 11-31 (skip missing 5 and 10)
		const allLevels = [
			...Array.from({ length: 4 }, (_, i) => i + 1),   // 1-4
			...Array.from({ length: 4 }, (_, i) => i + 6),   // 6-9
			...Array.from({ length: 21 }, (_, i) => i + 11), // 11-31
		]
		this.data.unlockedLevels = allLevels
		this.save()
	}
}

// Auto-initialize
LevelProgress.init()
