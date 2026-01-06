/**
 * Level 3 - 战斗关卡（小兵地图）
 * 原 CombatScene，现改用 BaseScene 架构
 */

import Phaser from 'phaser'
import { BaseScene } from '../base/BaseScene'
import { getCombatConfig, DifficultyConfig } from '../../configs/CombatConfig'
import { getRandomTerrain } from '../../configs/TerrainTemplates'
import { MinionSpawner } from '../../MinionSpawner'

export class Level3 extends BaseScene {
	private chapter: number = 1
	private level: number = 1
	private difficulty?: DifficultyConfig

	private player?: Phaser.GameObjects.Rectangle
	private minionSpawner?: MinionSpawner
	private obstacles: Phaser.GameObjects.Rectangle[] = []

	private playerHealth: number = 200
	private playerMaxHealth: number = 200
	private playerSpeed: number = 200

	private healthText?: Phaser.GameObjects.Text
	private killCountText?: Phaser.GameObjects.Text
	private killCount: number = 0

	constructor() {
		super({ key: 'Level3' })
	}

	/**
	 * 初始化关卡（从外部调用）
	 */
	init(data?: { chapter?: number; level?: number; playerX?: number; playerY?: number }): void {
		// 调用BaseScene的init
		super.init(data)

		this.chapter = data?.chapter || 1
		this.level = data?.level || 1

		this.difficulty = getCombatConfig(this.chapter, this.level)

		if (!this.difficulty) {
			console.error(`[Level3] 找不到配置: Chapter ${this.chapter}, Level ${this.level}`)
		}

		console.log(`[Level3] 初始化: Chapter ${this.chapter}-${this.level}`)
	}

	/**
	 * 关卡特有初始化逻辑
	 */
	protected onLevelCreate(): void {
		if (!this.difficulty) {
			console.error('[Level3] 难度配置缺失')
			return
		}

		// 重置状态
		this.killCount = 0
		this.playerHealth = this.playerMaxHealth

		// 创建地图
		this.createTerrain()

		// 创建战斗玩家（与BaseScene的ECS玩家分离）
		this.createCombatPlayer()

		// 创建UI
		this.createCombatUI()

		// 创建小怪生成器
		this.minionSpawner = new MinionSpawner(this, this.difficulty)
		this.minionSpawner.startSpawning()

		// 监听小怪死亡
		this.events.on('minion-killed', this.onMinionKilled, this)

		// 设置碰撞
		this.setupCombatCollisions()

		// 玩家控制
		this.setupCombatControls()
	}

	/**
	 * 关卡特有更新逻辑
	 */
	protected onLevelUpdate(): void {
		if (this.minionSpawner) {
			this.minionSpawner.update(this.game.loop.delta)
		}
	}

	/**
	 * 创建地形
	 */
	private createTerrain(): void {
		// 背景
		this.add.rectangle(480, 270, 960, 540, 0x1a1a1a)

		// 随机地形模板
		const terrain = getRandomTerrain()
		console.log(`[Level3] 使用地形: ${terrain.name}`)

		// 创建障碍物
		terrain.obstacles.forEach((obs) => {
			const obstacle = this.add.rectangle(
				obs.x + obs.width / 2,
				obs.y + obs.height / 2,
				obs.width,
				obs.height,
				0x555555
			)

			this.physics.add.existing(obstacle, true) // 静态物体
			this.obstacles.push(obstacle)
		})
	}

	/**
	 * 创建战斗玩家（独立于BaseScene的ECS玩家）
	 */
	private createCombatPlayer(): void {
		this.player = this.add.rectangle(480, 270, 30, 30, 0x00ff00)
		this.player.setName('combat-player')

		this.physics.add.existing(this.player)

		const body = this.player.body as Phaser.Physics.Arcade.Body
		body.setCollideWorldBounds(true)
	}

	/**
	 * 创建战斗UI
	 */
	private createCombatUI(): void {
		this.healthText = this.add.text(20, 20, '', {
			fontSize: '20px',
			color: '#00ff00',
		})

		this.killCountText = this.add.text(20, 50, '', {
			fontSize: '18px',
			color: '#ffff00',
		})

		this.add.text(20, 80, `Chapter ${this.chapter}-${this.level}`, {
			fontSize: '16px',
			color: '#ffffff',
		})

		this.updateCombatUI()
	}

	/**
	 * 设置战斗碰撞
	 */
	private setupCombatCollisions(): void {
		if (!this.player || !this.minionSpawner) return

		// 玩家与障碍物碰撞
		this.obstacles.forEach((obs) => {
			this.physics.add.collider(this.player!, obs)
		})

		// 玩家与小怪碰撞
		this.physics.add.overlap(this.player, { name: 'minion' } as any, this.onPlayerHitMinion, undefined, this)
	}

	/**
	 * 战斗控制（WASD + Space）
	 */
	private setupCombatControls(): void {
		// WASD移动
		this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
			if (!this.player) return

			const body = this.player.body as Phaser.Physics.Arcade.Body

			// 简单的8方向移动
			let vx = 0
			let vy = 0

			const keys = this.input.keyboard!
			if (keys.addKey('W').isDown) vy -= 1
			if (keys.addKey('S').isDown) vy += 1
			if (keys.addKey('A').isDown) vx -= 1
			if (keys.addKey('D').isDown) vx += 1

			// 归一化
			if (vx !== 0 || vy !== 0) {
				const len = Math.sqrt(vx * vx + vy * vy)
				vx = (vx / len) * this.playerSpeed
				vy = (vy / len) * this.playerSpeed
			}

			body.setVelocity(vx, vy)
		})

		// 空格攻击
		this.input.keyboard?.on('keydown-SPACE', () => {
			this.playerAttack()
		})
	}

	/**
	 * 玩家攻击
	 */
	private playerAttack(): void {
		if (!this.player || !this.minionSpawner) return

		const minions = this.minionSpawner.getMinions()

		// 范围攻击（100px）
		minions.forEach((minion) => {
			const dx = minion.x - this.player!.x
			const dy = minion.y - this.player!.y
			const distance = Math.sqrt(dx * dx + dy * dy)

			if (distance < 100) {
				minion.takeDamage(20)
			}
		})

		// 攻击特效
		const flash = this.add.circle(this.player.x, this.player.y, 100, 0x00ff00, 0.3)
		this.tweens.add({
			targets: flash,
			alpha: 0,
			scale: 1.2,
			duration: 200,
			onComplete: () => flash.destroy(),
		})
	}

	/**
	 * 玩家被小怪碰到
	 */
	private onPlayerHitMinion(player: any, minion: any): void {
		// 简化：直接扣血
		this.playerHealth -= 10

		if (this.playerHealth <= 0) {
			this.playerHealth = 0
			this.gameOver()
		}

		this.updateCombatUI()
	}

	/**
	 * 小怪被击杀
	 */
	private onMinionKilled(): void {
		this.killCount++
		this.updateCombatUI()

		// 检查是否通关
		if (this.minionSpawner && !this.minionSpawner.hasMinions()) {
			this.levelComplete()
		}
	}

	/**
	 * 更新战斗UI
	 */
	private updateCombatUI(): void {
		if (this.healthText) {
			this.healthText.setText(`HP: ${this.playerHealth}/${this.playerMaxHealth}`)
		}
		if (this.killCountText) {
			this.killCountText.setText(`Kills: ${this.killCount}`)
		}
	}

	/**
	 * 关卡完成
	 */
	private levelComplete(): void {
		console.log('[Level3] 关卡完成！')

		const text = this.add.text(480, 270, 'Level Complete!', {
			fontSize: '48px',
			color: '#00ff00',
		})
		text.setOrigin(0.5)

		this.time.delayedCall(2000, () => {
			// 返回关卡选择
			this.scene.start('LevelSelectScene')
		})
	}

	/**
	 * 游戏失败
	 */
	private gameOver(): void {
		console.log('[Level3] 游戏失败')

		const text = this.add.text(480, 270, 'Game Over', {
			fontSize: '48px',
			color: '#ff0000',
		})
		text.setOrigin(0.5)

		this.time.delayedCall(2000, () => {
			// 重启关卡
			this.scene.restart()
		})
	}

	/**
	 * 场景关闭时清理
	 */
	shutdown(): void {
		if (this.minionSpawner) {
			this.minionSpawner.destroy()
		}

		this.obstacles = []
		this.events.off('minion-killed')
	}
}
