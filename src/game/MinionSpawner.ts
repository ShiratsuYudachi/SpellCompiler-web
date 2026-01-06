/**
 * 小怪生成器
 * 位置：game/MinionSpawner.ts
 */

import Phaser from 'phaser'
import { DifficultyConfig } from './configs/CombatConfig'
import { BaseMinion, MinionConfig } from './minions/BaseMinion'
import { BasicMinion } from './minions/BasicMinion'
import { TeleportMinion } from './minions/TeleportMinion'
import { TurretMinion } from './minions/TurretMinion'
import { FastMinion } from './minions/FastMinion'

export class MinionSpawner {
	private scene: Phaser.Scene
	private difficulty: DifficultyConfig
	private minions: BaseMinion[] = []
	private spawnTimer?: Phaser.Time.TimerEvent
	private remainingCount: number

	constructor(scene: Phaser.Scene, difficulty: DifficultyConfig) {
		this.scene = scene
		this.difficulty = difficulty

		// 随机生成数量
		const { min, max } = difficulty.minionCount
		this.remainingCount = Math.floor(Math.random() * (max - min + 1)) + min
	}

	/**
	 * 开始生成小怪
	 */
	startSpawning(): void {
		this.spawnTimer = this.scene.time.addEvent({
			delay: this.difficulty.spawnInterval,
			callback: () => this.spawnMinion(),
			loop: true,
		})

		// 立即生成第一波
		this.spawnMinion()
	}

	/**
	 * 停止生成
	 */
	stopSpawning(): void {
		if (this.spawnTimer) {
			this.spawnTimer.destroy()
			this.spawnTimer = undefined
		}
	}

	/**
	 * 生成单个小怪
	 */
	private spawnMinion(): void {
		if (this.remainingCount <= 0) {
			this.stopSpawning()
			return
		}

		const type = this.getRandomMinionType()
		const pos = this.getRandomSpawnPosition()
		const config = this.getRandomMinionConfig()

		let minion: BaseMinion

		switch (type) {
			case 'basic':
				minion = new BasicMinion(this.scene, pos.x, pos.y, config)
				break
			case 'teleport':
				minion = new TeleportMinion(this.scene, pos.x, pos.y, config)
				break
			case 'turret':
				minion = new TurretMinion(this.scene, pos.x, pos.y, config)
				break
			case 'fast':
				minion = new FastMinion(this.scene, pos.x, pos.y, config)
				break
			default:
				minion = new BasicMinion(this.scene, pos.x, pos.y, config)
		}

		this.minions.push(minion)
		this.remainingCount--

		console.log(`[MinionSpawner] 生成 ${type} 小怪，剩余: ${this.remainingCount}`)
	}

	/**
	 * 随机选择小怪类型
	 */
	private getRandomMinionType(): string {
		const types = this.difficulty.minionTypes
		const index = Math.floor(Math.random() * types.length)
		return types[index]
	}

	/**
	 * 随机生成位置（屏幕边缘）
	 */
	private getRandomSpawnPosition(): { x: number; y: number } {
		const side = Math.floor(Math.random() * 4)

		switch (side) {
			case 0: // 上
				return { x: Math.random() * 960, y: -50 }
			case 1: // 下
				return { x: Math.random() * 960, y: 590 }
			case 2: // 左
				return { x: -50, y: Math.random() * 540 }
			case 3: // 右
				return { x: 1010, y: Math.random() * 540 }
			default:
				return { x: 480, y: 270 }
		}
	}

	/**
	 * 随机生成小怪配置
	 */
	private getRandomMinionConfig(): MinionConfig {
		const { minionHealth, minionSpeed, minionDamage } = this.difficulty

		return {
			health: Math.floor(Math.random() * (minionHealth.max - minionHealth.min + 1)) + minionHealth.min,
			speed: Math.floor(Math.random() * (minionSpeed.max - minionSpeed.min + 1)) + minionSpeed.min,
			damage: Math.floor(Math.random() * (minionDamage.max - minionDamage.min + 1)) + minionDamage.min,
		}
	}

	/**
	 * 更新所有小怪
	 */
	update(delta: number): void {
		for (let i = this.minions.length - 1; i >= 0; i--) {
			const minion = this.minions[i]

			if (!minion.active) {
				this.minions.splice(i, 1)
			} else {
				minion.update(delta)
			}
		}
	}

	/**
	 * 获取所有存活小怪
	 */
	getMinions(): BaseMinion[] {
		return this.minions.filter((m) => m.active)
	}

	/**
	 * 是否还有小怪
	 */
	hasMinions(): boolean {
		return this.getMinions().length > 0 || this.remainingCount > 0
	}

	/**
	 * 清理所有小怪
	 */
	destroy(): void {
		this.stopSpawning()
		this.minions.forEach((m) => m.destroy())
		this.minions = []
	}
}
