/**
 * LevelProgress - 关卡进度管理
 * 使用localStorage持久化
 */

const STORAGE_KEY = 'spell_compiler_progress'

export interface LevelProgressData {
	unlockedLevels: number[]
	completedLevels: number[]
	currentLevel: number
}

export class LevelProgress {
	private static data: LevelProgressData = {
		unlockedLevels: [1], // 默认解锁第1关
		completedLevels: [],
		currentLevel: 1,
	}

	/**
	 * 初始化（从localStorage加载）
	 */
	static init() {
		const saved = localStorage.getItem(STORAGE_KEY)
		if (saved) {
			try {
				this.data = JSON.parse(saved)
			} catch (e) {
				console.error('Failed to parse progress:', e)
			}
		}
	}

	/**
	 * 保存到localStorage
	 */
	static save() {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
	}

	/**
	 * 检查关卡是否解锁
	 */
	static isLevelUnlocked(level: number): boolean {
		return this.data.unlockedLevels.includes(level)
	}

	/**
	 * 检查关卡是否完成
	 */
	static isLevelCompleted(level: number): boolean {
		return this.data.completedLevels.includes(level)
	}

	/**
	 * 解锁关卡
	 */
	static unlockLevel(level: number) {
		if (!this.data.unlockedLevels.includes(level)) {
			this.data.unlockedLevels.push(level)
			this.save()
		}
	}

	/**
	 * 完成关卡（自动解锁下一关）
	 */
	static completeLevel(level: number) {
		if (!this.data.completedLevels.includes(level)) {
			this.data.completedLevels.push(level)
		}

		// 解锁下一关
		const nextLevel = level + 1
		if (nextLevel <= 20) {
			this.unlockLevel(nextLevel)
		}

		this.save()
	}

	/**
	 * 获取已解锁关卡列表
	 */
	static getUnlockedLevels(): number[] {
		return [...this.data.unlockedLevels]
	}

	/**
	 * 获取已完成关卡列表
	 */
	static getCompletedLevels(): number[] {
		return [...this.data.completedLevels]
	}

	/**
	 * 重置进度（开发用）
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
	 * 解锁所有关卡（开发用）
	 */
	static unlockAll() {
		this.data.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1)
		this.save()
	}
}

// 自动初始化
LevelProgress.init()
