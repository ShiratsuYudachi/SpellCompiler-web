/**
 * Level1 - 解谜关卡（基于Scene1）
 * 任务1: 用teleportRelative接近Boss并击败
 * 任务2: 收集3+个位置点解锁移动
 */

import Phaser from 'phaser'
import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Enemy, Health, Sprite } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'

export class Level1 extends BaseScene {
	private teleportTargets: Array<{
		x: number
		y: number
		label: string
		marker: Phaser.GameObjects.Arc
		labelText: Phaser.GameObjects.Text
		coordText: Phaser.GameObjects.Text
		collector: Phaser.Physics.Arcade.Image
		collected: boolean
	}> = []
	private targetCollisionsSet = false
	private minimapContainer!: Phaser.GameObjects.Container
	private minimapWorldWidth = 2880
	private minimapWorldHeight = 1620
	private minimapScale = 0.1
	private minimapWidth = 0
	private minimapHeight = 0
	private minimapPlayerDot!: Phaser.GameObjects.Arc
	private minimapTargetDots: Phaser.GameObjects.Arc[] = []
	private minimapBackground!: Phaser.GameObjects.Rectangle
	private minimapWorldBorder!: Phaser.GameObjects.Rectangle
	private minimapResizeHandle!: Phaser.GameObjects.Rectangle
	private isResizingMinimap = false
	private minimapMinScale = 0.05
	private minimapMaxScale = 0.25
	private bossEid: number | null = null
	private bossDefeated = false
	private locationCollectionUnlocked = false
	private instructionText!: Phaser.GameObjects.Text
	private bossCoordText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level1' })
	}

	protected onLevelCreate(): void {
		// 重置状态
		this.targetCollisionsSet = false
		this.teleportTargets = []
		this.bossEid = null
		this.bossDefeated = false
		this.locationCollectionUnlocked = false
		if (this.minimapContainer) {
			this.minimapContainer.destroy()
		}
		this.minimapTargetDots = []

		// 设置背景和世界边界
		this.cameras.main.setBackgroundColor('#2a1b1f')
		const worldWidth = 2880
		const worldHeight = 1620
		this.physics.world.setBounds(0, 0, worldWidth, worldHeight)

		// 初始化分数
		this.world.resources.score = 0
		this.bossDefeated = false
		this.locationCollectionUnlocked = false

		// 设置相机跟随
		this.time.delayedCall(0, () => {
			const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
			if (playerBody) {
				this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
				this.cameras.main.setBounds(0, 0, worldWidth, worldHeight)
			}
		})

		// 创建Boss
		this.time.delayedCall(0, () => {
			this.createBoss()
		})

		// 创建传送目标点
		this.createTeleportTargets()
		// 初始隐藏
		this.setTeleportTargetsVisible(false)

		// 创建小地图
		this.createMinimap()
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid

		// 检查Boss是否被击败
		if (this.bossEid !== null && !this.bossDefeated) {
			const bossHealth = Health.current[this.bossEid]
			if (bossHealth <= 0) {
				this.onBossDefeated()
			}
		}

		// 任务1: Boss未击败时禁用玩家移动
		if (!this.bossDefeated) {
			Velocity.x[playerEid] = 0
			Velocity.y[playerEid] = 0
			const playerBody = this.world.resources.bodies.get(playerEid)
			if (playerBody) {
				playerBody.setVelocity(0, 0)
			}
		} else {
			// 任务2: Boss击败后，收集少于3个位置时禁用移动
			const collectedCount = this.teleportTargets.filter((t) => t.collected).length
			if (this.locationCollectionUnlocked && collectedCount < 3) {
				Velocity.x[playerEid] = 0
				Velocity.y[playerEid] = 0
				const playerBody = this.world.resources.bodies.get(playerEid)
				if (playerBody) {
					playerBody.setVelocity(0, 0)
				}
			}
		}

		// 更新目标点动态坐标（仅在解锁后）
		if (this.locationCollectionUnlocked) {
			this.updateTargetCoordinates()
		}

		// 更新Boss坐标显示
		if (this.bossEid !== null && !this.bossDefeated && this.bossCoordText) {
			this.updateBossCoordinates()
		}

		// 更新小地图
		this.updateMinimap()

		// 更新HUD
		this.updateHud()
	}

	private createBoss() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			this.time.delayedCall(0, () => this.createBoss())
			return
		}

		const bossX = playerBody.x + 200
		const bossY = playerBody.y

		// 创建Boss物理体
		const bossBody = createRectBody(this, 'boss-rect', 0xff0000, 64, 64, bossX, bossY, 5)
		bossBody.setImmovable(true)
		bossBody.setTint(0xff0000)

		this.bossEid = spawnEntity(this.world)
		this.world.resources.bodies.set(this.bossEid, bossBody)

		// 添加组件
		addComponent(this.world, this.bossEid, Sprite)
		addComponent(this.world, this.bossEid, Enemy)
		addComponent(this.world, this.bossEid, Health)

		// 设置血量
		Health.max[this.bossEid] = 100
		Health.current[this.bossEid] = 100

		// Boss标签
		const bossLabel = this.add.text(bossX, bossY - 80, 'BOSS', {
			fontSize: '24px',
			color: '#ff0000',
			fontStyle: 'bold',
		})
		bossLabel.setOrigin(0.5, 0.5)
		bossLabel.setDepth(10)

		// Boss坐标显示
		this.bossCoordText = this.add.text(bossX, bossY + 50, 'dx: 0\ndy: 0', {
			fontSize: '14px',
			color: '#ffffff',
			align: 'center',
			fontStyle: 'bold',
			backgroundColor: '#ff0000',
			padding: { x: 6, y: 3 },
		})
		this.bossCoordText.setOrigin(0.5, 0.5)
		this.bossCoordText.setDepth(10)

		this.data.set('bossLabel', bossLabel)
	}

	private onBossDefeated() {
		this.bossDefeated = true
		this.locationCollectionUnlocked = true

		// 显示所有传送目标
		this.setTeleportTargetsVisible(true)

		// 设置目标碰撞检测
		this.setupTargetCollisions()

		// 移除Boss
		if (this.bossEid !== null) {
			const bossBody = this.world.resources.bodies.get(this.bossEid)
			if (bossBody) {
				bossBody.destroy()
			}
		}
		const bossLabel = this.data.get('bossLabel') as Phaser.GameObjects.Text | undefined
		if (bossLabel) {
			bossLabel.destroy()
		}
		if (this.bossCoordText) {
			this.bossCoordText.destroy()
		}

		// 胜利消息
		const victoryText = this.add.text(480, 270, 'BOSS DEFEATED!\nLocation collection unlocked!', {
			fontSize: '32px',
			color: '#00ff00',
			align: 'center',
			fontStyle: 'bold',
			backgroundColor: '#000000',
			padding: { x: 20, y: 10 },
		})
		victoryText.setOrigin(0.5, 0.5)
		victoryText.setDepth(100)
		victoryText.setScrollFactor(0)

		this.tweens.add({
			targets: victoryText,
			alpha: 0,
			duration: 3000,
			onComplete: () => victoryText.destroy(),
		})

		// 更新说明文字
		if (this.instructionText) {
			this.instructionText.setText('Task 2: Use teleportRelative(dx,dy) to collect locations | Collect 3 to unlock movement')
		}
	}

	private setTeleportTargetsVisible(visible: boolean) {
		this.teleportTargets.forEach((target) => {
			if (!target.collected) {
				target.marker.setVisible(visible)
				target.labelText.setVisible(visible)
				target.coordText.setVisible(visible)
				target.collector.setVisible(visible)
			}
		})
	}

	private createTeleportTargets() {
		const targets = [
			{ x: 480, y: 270, label: 'Center' },
			{ x: 200, y: 270, label: 'Left Center' },
			{ x: 760, y: 270, label: 'Right Center' },
			{ x: 480, y: 100, label: 'Top Center' },
			{ x: 480, y: 440, label: 'Bottom Center' },
			{ x: 1440, y: 270, label: 'Far Right' },
			{ x: 1440, y: 810, label: 'Far Bottom Right' },
			{ x: 2400, y: 270, label: 'Extreme Right' },
			{ x: 2400, y: 810, label: 'Extreme Bottom Right' },
			{ x: 1440, y: 1350, label: 'Far Bottom' },
			{ x: 2400, y: 1350, label: 'Extreme Bottom' },
		]

		// 创建collector纹理
		if (!this.textures.exists('collector-point')) {
			const g = this.add.graphics()
			g.fillStyle(0xffffff, 1)
			g.fillCircle(0, 0, 20)
			g.generateTexture('collector-point', 40, 40)
			g.destroy()
		}

		targets.forEach((target) => {
			// 标记圆圈
			const marker = this.add.circle(target.x, target.y, 20, 0x00ffff, 0.6)
			marker.setStrokeStyle(2, 0x00ffff, 1)
			marker.setDepth(2)

			// 脉动动画
			this.tweens.add({
				targets: marker,
				scaleX: 1.3,
				scaleY: 1.3,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			})

			// 收集器（物理体）
			const collector = this.physics.add.image(target.x, target.y, 'collector-point')
			collector.setDisplaySize(40, 40)
			collector.setAlpha(0)
			collector.setImmovable(true)

			// 标签
			const labelText = this.add.text(target.x, target.y - 50, target.label, {
				fontSize: '14px',
				color: '#00ffff',
				align: 'center',
				fontStyle: 'bold',
			})
			labelText.setOrigin(0.5, 0.5)
			labelText.setDepth(3)

			// 坐标文字
			const coordText = this.add.text(target.x, target.y + 35, 'dx: 0\ndy: 0', {
				fontSize: '12px',
				color: '#ffffff',
				align: 'center',
				backgroundColor: '#000000',
				padding: { x: 4, y: 2 },
			})
			coordText.setOrigin(0.5, 0.5)
			coordText.setDepth(3)

			this.teleportTargets.push({
				x: target.x,
				y: target.y,
				label: target.label,
				marker,
				labelText,
				coordText,
				collector,
				collected: false,
			})
		})

		// 说明文字
		this.instructionText = this.add.text(
			20,
			520,
			'Task 1: Use teleportRelative(dx,dy) to get near the boss, then use melee (Space) to defeat it',
			{
				fontSize: '12px',
				color: '#ffff00',
				align: 'left',
				fontStyle: 'bold',
				backgroundColor: '#000000',
				padding: { x: 8, y: 4 },
			}
		)
		this.instructionText.setOrigin(0, 1)
		this.instructionText.setDepth(4)
		this.instructionText.setScrollFactor(0)
	}

	private setupTargetCollisions() {
		if (this.targetCollisionsSet || this.teleportTargets.length === 0) {
			return
		}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			this.time.delayedCall(0, () => this.setupTargetCollisions())
			return
		}

		this.teleportTargets.forEach((target) => {
			this.physics.add.overlap(playerBody, target.collector, () => {
				if (!target.collected) {
					target.collected = true
					target.marker.setFillStyle(0x00ff00, 0.8)
					target.marker.setStrokeStyle(2, 0x00ff00, 1)
					target.labelText.setColor('#00ff00')
					target.coordText.setText('COLLECTED')
					target.coordText.setColor('#00ff00')
					target.collector.setVisible(false)

					// 增加分数
					if (this.world.resources.score !== undefined) {
						this.world.resources.score += 10
					}

					// 收集音效
					// this.sound.play('collect')

					// 检查是否收集满3个
					const collectedCount = this.teleportTargets.filter((t) => t.collected).length
					if (collectedCount >= 3) {
						// 解锁移动
						const unlockText = this.add.text(480, 270, 'Movement Unlocked!\nYou can now move freely!', {
							fontSize: '24px',
							color: '#00ff00',
							align: 'center',
							fontStyle: 'bold',
							backgroundColor: '#000000',
							padding: { x: 15, y: 8 },
						})
						unlockText.setOrigin(0.5, 0.5)
						unlockText.setDepth(100)
						unlockText.setScrollFactor(0)

						this.tweens.add({
							targets: unlockText,
							alpha: 0,
							duration: 2000,
							delay: 1000,
							onComplete: () => unlockText.destroy(),
						})

						if (this.instructionText) {
							this.instructionText.setText('Movement unlocked! Find the exit gate to proceed to the next level')
						}
					}
				}
			})
		})

		this.targetCollisionsSet = true
	}

	private updateTargetCoordinates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		this.teleportTargets.forEach((target) => {
			if (!target.collected) {
				const dx = Math.round(target.x - playerBody.x)
				const dy = Math.round(target.y - playerBody.y)
				target.coordText.setText(`dx: ${dx}\ndy: ${dy}`)
			}
		})
	}

	private updateBossCoordinates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		const bossBody = this.world.resources.bodies.get(this.bossEid!)
		if (playerBody && bossBody) {
			const dx = Math.round(bossBody.x - playerBody.x)
			const dy = Math.round(bossBody.y - playerBody.y)
			this.bossCoordText.setText(`dx: ${dx}\ndy: ${dy}`)
			this.bossCoordText.setPosition(bossBody.x, bossBody.y + 50)
		}
	}

    private createMinimap() {
    // 确保宽度和高度已计算
    this.minimapWidth = this.minimapWorldWidth * this.minimapScale;
    this.minimapHeight = this.minimapWorldHeight * this.minimapScale;

    // 安全获取屏幕尺寸
    const gameWidth = this.cameras.main.width;
    const margin = 20;
    
    // 计算右上角坐标：屏幕宽度 - 小地图宽度 - 边距
    const posX = gameWidth - this.minimapWidth - margin - 10;
    const posY = margin;

    // 创建容器并确保它被正确添加到场景
    this.minimapContainer = this.add.container(posX, posY).setScrollFactor(0).setDepth(1000);

    // 背景和边框
    this.minimapBackground = this.add
        .rectangle(0, 0, this.minimapWidth + 10, this.minimapHeight + 10, 0x000000, 0.7)
        .setOrigin(0, 0);

    this.minimapWorldBorder = this.add
        .rectangle(5, 5, this.minimapWidth, this.minimapHeight)
        .setOrigin(0, 0)
        .setStrokeStyle(2, 0xffffff, 0.5);

    // 玩家点
    this.minimapPlayerDot = this.add.circle(0, 0, 3, 0x00ff00);

    // 将基础组件加入容器
    this.minimapContainer.add([this.minimapBackground, this.minimapWorldBorder, this.minimapPlayerDot]);

    // --- 修复可能的 'once' 错误 ---
    // 如果你在监听屏幕调整大小，请确保 scale 对象存在
    if (this.scale) {
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            if (this.minimapContainer) {
                const newX = gameSize.width - this.minimapWidth - margin - 10;
                this.minimapContainer.setPosition(newX, margin);
            }
        });
    }
}

	private updateMinimap() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		// 更新玩家位置
		const playerMinimapX = (playerBody.x / this.minimapWorldWidth) * this.minimapWidth + 5
		const playerMinimapY = (playerBody.y / this.minimapWorldHeight) * this.minimapHeight + 5
		this.minimapPlayerDot.setPosition(playerMinimapX, playerMinimapY)

		// 更新目标点（如果已解锁）
		if (this.locationCollectionUnlocked) {
			// 如果还没添加目标点到小地图，添加它们
			if (this.minimapTargetDots.length === 0) {
				this.teleportTargets.forEach((target) => {
					const dot = this.add.circle(0, 0, 2, 0x00ffff)
					this.minimapTargetDots.push(dot)
					this.minimapContainer.add(dot)
				})
			}

			// 更新目标点位置和颜色
			this.teleportTargets.forEach((target, index) => {
				const dot = this.minimapTargetDots[index]
				if (dot) {
					const x = (target.x / this.minimapWorldWidth) * this.minimapWidth + 5
					const y = (target.y / this.minimapWorldHeight) * this.minimapHeight + 5
					dot.setPosition(x, y)
					dot.setFillStyle(target.collected ? 0x00ff00 : 0x00ffff)
				}
			})
		}
	}

	private updateHud() {
		// HUD已由BaseScene的hudSystem处理
		// 这里可以添加额外的HUD元素
	}
}
