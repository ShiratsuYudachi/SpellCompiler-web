import Phaser from 'phaser'
import { GameEvents } from '../../events'
import type { CompiledSpell } from '../../spells/types'
import { createGameWorld, updateGameWorld, type GameWorld } from '../../gameWorld'
import { getPlayerSpawnPosition, getSceneConfig } from '../sceneConfig'
import { TerrainType, type ObjectiveConfig } from './TerrainTypes'
import { TerrainRenderer } from './TerrainRenderer'
import { Health, Enemy } from '../../components'
import { LevelProgress } from './LevelProgress'
import { setEditorContext } from '../../gameInstance'

export abstract class BaseScene extends Phaser.Scene {
	protected world!: GameWorld
	protected platforms!: Phaser.Physics.Arcade.StaticGroup
	protected hazards: Phaser.GameObjects.Rectangle[] = []
	protected objectives: Map<string, { sprite: Phaser.GameObjects.Arc; config: ObjectiveConfig }> = new Map()
	protected terrainRenderer!: TerrainRenderer
	protected allObjectives: ObjectiveConfig[] = [] // 所有任务

	// UI组件
	private hpBar!: Phaser.GameObjects.Graphics
	private hpText!: Phaser.GameObjects.Text
	private manaBar!: Phaser.GameObjects.Graphics
	private manaText!: Phaser.GameObjects.Text
	private taskPanel!: Phaser.GameObjects.Container
	private taskText!: Phaser.GameObjects.Text
	private tutorialOverlay!: Phaser.GameObjects.Container
	private controlsPanel!: Phaser.GameObjects.Container

	// Minimap
	private minimapContainer!: Phaser.GameObjects.Container
	private minimapBg!: Phaser.GameObjects.Graphics
	private minimapPlayerDot!: Phaser.GameObjects.Arc
	private minimapEnemyDots: Phaser.GameObjects.Arc[] = []
	private minimapObjectiveDots: Phaser.GameObjects.Arc[] = []

	private worldWidth = 960
	private worldHeight = 540

	init(data?: { playerX?: number; playerY?: number }) {
		this.data.set('playerSpawnX', data?.playerX)
		this.data.set('playerSpawnY', data?.playerY)
	}

	create() {
		const config = getSceneConfig(this.scene.key)

		// 计算动态世界大小
		if (config?.mapData) {
			const tileSize = config.tileSize || 64
			this.worldWidth = config.mapData[0].length * tileSize
			this.worldHeight = config.mapData.length * tileSize
		}

		// 物理世界基础
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight)
		this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight)

		const spawnX = this.data.get('playerSpawnX') ?? getPlayerSpawnPosition(this.scene.key).x
		const spawnY = this.data.get('playerSpawnY') ?? getPlayerSpawnPosition(this.scene.key).y

		this.world = createGameWorld(this, spawnX, spawnY, false)
		this.platforms = this.physics.add.staticGroup()
		this.hazards = []
		this.objectives.clear()
		this.terrainRenderer = new TerrainRenderer(this)

		// 自动生成地形
		if (config?.mapData) {
			this.generateTerrain(config.mapData, config.tileSize || 64)
		}

		// 碰撞逻辑
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.physics.add.collider(playerBody, this.platforms)
			playerBody.setCollideWorldBounds(true)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 初始化 UI 系统
		this.initPlayerHUD()
		this.initTaskUI()
		this.initMinimap()
		this.initControlsPanel()
		this.initTutorial()

		// 初始化渐进式任务
		if (config?.objectives) {
			this.initProgressiveObjectives(config.objectives)
		}

		// 编辑器与法术事件
		this.bindGlobalEvents()

		this.onLevelCreate()
	}

	update() {
		updateGameWorld(this.world, this.game.loop.delta / 1000)
		this.updatePlayerHUD()
		this.updateMinimap()
		this.updateHazards()
		this.updateObjectives()
		this.onLevelUpdate()
	}

	// --- 渐进式任务系统 ---
	private initProgressiveObjectives(objectives: ObjectiveConfig[]) {
		this.allObjectives = objectives.map(obj => ({
			...obj,
			completed: false,
			visible: !obj.prerequisite
		}))

		this.updateTaskDisplay()
	}

	private updateTaskDisplay() {
		const visibleTasks = this.allObjectives
			.filter(obj => obj.visible)
			.map(obj => `${obj.completed ? '✓' : '☐'} ${obj.description}`)

		this.taskText.setText(visibleTasks.join('\n'))
	}

	private unlockNextObjective(completedId: string) {
		this.allObjectives.forEach(obj => {
			if (obj.prerequisite === completedId) {
				obj.visible = true
			}
		})

		this.updateTaskDisplay()
	}

	// 【新增】子类可以手动完成任务
	protected completeObjectiveById(id: string) {
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task && !task.completed) {
			task.completed = true
			this.unlockNextObjective(id)
			this.updateTaskDisplay()

			// 检查是否全部完成
			if (this.allObjectives.every(obj => obj.completed)) {
				this.onAllObjectivesComplete()
			}
		}
	}

	// 【新增】更新任务描述（用于显示进度）
	protected updateObjectiveDescription(id: string, newDescription: string) {
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task) {
			task.description = newDescription
			this.updateTaskDisplay()
		}
	}

	// --- 地形生成器 ---
	private generateTerrain(data: number[][], size: number) {
		data.forEach((row, y) => {
			row.forEach((type, x) => {
				const posX = x * size + size / 2
				const posY = y * size + size / 2

				switch (type) {
					case TerrainType.WALL:
						this.createWall(posX, posY, size)
						break
					case TerrainType.PLATFORM:
						this.createPlatform(posX, posY, size)
						break
					case TerrainType.HAZARD:
						this.createHazard(posX, posY, size)
						break
					case TerrainType.OBJECTIVE:
						this.createObjectiveMarker(posX, posY, size, `obj-${x}-${y}`)
						break
				}
			})
		})
	}

	private createWall(x: number, y: number, size: number) {
		this.terrainRenderer.renderWall(x, y, size)
		const wall = this.add.rectangle(x, y, size - 2, size - 2, 0x3e4a59, 1)
		this.physics.add.existing(wall, true)
		this.platforms.add(wall)
	}

	private createPlatform(x: number, y: number, size: number) {
		this.terrainRenderer.renderPlatform(x, y, size)
		const plat = this.add.rectangle(x, y, size - 2, 12, 0x4a7c59, 1)
		this.physics.add.existing(plat, true)
		this.platforms.add(plat)
	}

	private createHazard(x: number, y: number, size: number) {
		this.terrainRenderer.renderHazard(x, y, size)
		const hazard = this.add.rectangle(x, y, size - 4, size - 4, 0x8b3a3a, 0)
		this.hazards.push(hazard)
	}

	private createObjectiveMarker(x: number, y: number, size: number, id: string) {
		const marker = this.terrainRenderer.renderObjective(x, y, size)
		this.objectives.set(id, {
			sprite: marker,
			config: { id, description: 'Reach objective', type: 'reach' },
		})
	}

	// --- 危险区更新 ---
	private updateHazards() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		this.hazards.forEach((hazard) => {
			const bounds = hazard.getBounds()
			if (
				playerBody.x > bounds.left &&
				playerBody.x < bounds.right &&
				playerBody.y > bounds.top &&
				playerBody.y < bounds.bottom
			) {
				const playerEid = this.world.resources.playerEid
				if (Health.current[playerEid] > 0) {
					Health.current[playerEid] = Math.max(0, Health.current[playerEid] - 0.5)
					playerBody.setTint(0xff0000)
					this.time.delayedCall(100, () => playerBody.clearTint())
				}
			}
		})
	}

	// --- 目标点更新 ---
	private updateObjectives() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		this.objectives.forEach((obj, id) => {
			if (obj.config.completed) return

			const distance = Phaser.Math.Distance.Between(playerBody.x, playerBody.y, obj.sprite.x, obj.sprite.y)
			if (distance < 30) {
				obj.config.completed = true
				obj.sprite.setFillStyle(0xffff00, 1)
				obj.sprite.setScale(1.5)

				this.tweens.add({
					targets: obj.sprite,
					alpha: 0,
					scale: 2,
					duration: 500,
					onComplete: () => obj.sprite.destroy(),
				})

				this.onObjectiveComplete(id, obj.config)
			}
		})
	}

	protected onObjectiveComplete(id: string, _objective: ObjectiveConfig) {
		// 标记任务完成
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task) {
			task.completed = true
			this.unlockNextObjective(id)
		}

		// 检查是否所有任务完成
		const allCompleted = this.allObjectives.every(obj => obj.completed)
		if (allCompleted) {
			this.onAllObjectivesComplete()
		}
	}

	protected onAllObjectivesComplete() {
		const levelNum = parseInt(this.scene.key.replace('Level', ''))
		if (!isNaN(levelNum)) {
			console.log('[BaseScene] Level completed:', levelNum)
			LevelProgress.completeLevel(levelNum)

			// Pause the scene and show victory screen
			this.scene.pause()
			this.game.events.emit(GameEvents.showVictory, { level: levelNum })
		}
	}

	// --- UI 系统 ---
	private initPlayerHUD() {
		const x = 20
		const y = 20
		const barWidth = 200
		const barHeight = 20

		this.add.rectangle(x, y, barWidth, barHeight, 0x000000, 0.7).setOrigin(0).setScrollFactor(0).setDepth(1000)
		this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(1001)
		this.hpText = this.add
			.text(x + 5, y + 3, 'HP: 100/100', {
				fontSize: '14px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0)
			.setScrollFactor(0)
			.setDepth(1002)

		this.add
			.rectangle(x, y + 30, barWidth, barHeight, 0x000000, 0.7)
			.setOrigin(0)
			.setScrollFactor(0)
			.setDepth(1000)

		this.manaBar = this.add.graphics().setScrollFactor(0).setDepth(1001)
		this.manaText = this.add
			.text(x + 5, y + 33, 'MP: 100/100', {
				fontSize: '14px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0)
			.setScrollFactor(0)
			.setDepth(1002)
	}

	private updatePlayerHUD() {
		const playerEid = this.world.resources.playerEid
		const currentHP = Health.current[playerEid] || 100
		const maxHP = Health.max[playerEid] || 100
		const currentMana = this.world.resources.mana ?? 100
		const maxMana = 100

		const hpPercent = currentHP / maxHP
		this.hpBar.clear()
		this.hpBar.fillStyle(0xff0000, 0.8)
		this.hpBar.fillRect(20, 20, 200 * hpPercent, 20)
		this.hpText.setText(`HP: ${Math.ceil(currentHP)}/${maxHP}`)

		const manaPercent = currentMana / maxMana
		this.manaBar.clear()
		this.manaBar.fillStyle(0x00ccff, 0.8)
		this.manaBar.fillRect(20, 50, 200 * manaPercent, 20)
		this.manaText.setText(`MP: ${Math.ceil(currentMana)}/${maxMana}`)
	}

	private initTaskUI() {
		this.taskPanel = this.add.container(735, 20).setScrollFactor(0).setDepth(1000)

		const bg = this.add.graphics()
		bg.fillStyle(0x1a1f2e, 0.95)
		bg.fillRoundedRect(0, 0, 210, 150, 8)
		bg.lineStyle(2, 0x4a90e2, 0.9)
		bg.strokeRoundedRect(0, 0, 210, 150, 8)

		const titleBg = this.add.graphics()
		titleBg.fillStyle(0x2d3748, 1)
		titleBg.fillRoundedRect(0, 0, 210, 35, { tl: 8, tr: 8, bl: 0, br: 0 })

		const title = this.add
			.text(105, 17, '>> OBJECTIVES', {
				fontSize: '15px',
				color: '#4a90e2',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		this.taskText = this.add.text(12, 45, '', {
			fontSize: '13px',
			color: '#e0e0e0',
			lineSpacing: 7,
			wordWrap: { width: 186 },
		})

		this.taskPanel.add([bg, titleBg, title, this.taskText])
	}

	protected setTaskInfo(_title: string, steps: string[]) {
		this.taskText.setText(steps.join('\n'))
	}

	private initMinimap() {
		const size = 150
		const x = 960 - size - 20
		const y = 540 - size - 20

		this.minimapContainer = this.add.container(x, y).setScrollFactor(0).setDepth(1000)

		this.minimapBg = this.add.graphics()
		this.minimapBg.fillStyle(0x000000, 0.8)
		this.minimapBg.fillRoundedRect(0, 0, size, size, 8)
		this.minimapBg.lineStyle(2, 0x4a90e2, 0.7)
		this.minimapBg.strokeRoundedRect(0, 0, size, size, 8)

		const minimapTitle = this.add
			.text(size / 2, -15, 'MINIMAP', {
				fontSize: '12px',
				color: '#4a90e2',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		this.minimapPlayerDot = this.add.circle(0, 0, 4, 0x00ff00)

		this.minimapContainer.add([this.minimapBg, minimapTitle, this.minimapPlayerDot])
	}

	private updateMinimap() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		const size = 150
		const scaleX = size / this.worldWidth
		const scaleY = size / this.worldHeight

		this.minimapPlayerDot.setPosition(playerBody.x * scaleX, playerBody.y * scaleY)

		this.minimapEnemyDots.forEach((dot) => dot.destroy())
		this.minimapEnemyDots = []

		this.world.resources.bodies.forEach((body, eid) => {
			if (eid !== this.world.resources.playerEid && (Enemy as Record<number, any>)[eid]) {
				const dot = this.add.circle(body.x * scaleX, body.y * scaleY, 3, 0xff0000, 0.8)
				dot.setScrollFactor(0).setDepth(1001)
				this.minimapContainer.add(dot)
				this.minimapEnemyDots.push(dot)
			}
		})

		this.minimapObjectiveDots.forEach((dot) => dot.destroy())
		this.minimapObjectiveDots = []
		this.objectives.forEach((obj) => {
			if (!obj.config.completed) {
				const dot = this.add.circle(obj.sprite.x * scaleX, obj.sprite.y * scaleY, 2, 0x00ffff, 0.8)
				dot.setScrollFactor(0).setDepth(1001)
				this.minimapContainer.add(dot)
				this.minimapObjectiveDots.push(dot)
			}
		})
	}

	private initControlsPanel() {
		const x = 20
		const y = 540 - 160

		this.controlsPanel = this.add.container(x, y).setScrollFactor(0).setDepth(1000)

		const bg = this.add.graphics()
		bg.fillStyle(0x1a1f2e, 0.85)
		bg.fillRoundedRect(0, 0, 250, 140, 8)
		bg.lineStyle(2, 0x4a90e2, 0.6)
		bg.strokeRoundedRect(0, 0, 250, 140, 8)

		const title = this.add.graphics()
		title.fillStyle(0x2d3748, 0.9)
		title.fillRoundedRect(0, 0, 250, 28, { tl: 8, tr: 8, bl: 0, br: 0 })

		const titleText = this.add
			.text(125, 14, 'CONTROLS', {
				fontSize: '13px',
				color: '#4a90e2',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		const controls = [
			'WASD / Arrows  →  Move',
			'Space  →  Melee (1s CD)',
			'Left Click  →  Fireball (0.3s CD)',
			'1  →  Cast Spell',
			'Tab  →  Toggle Editor',
			'ESC  →  Pause Menu',
		]

		const controlsText = this.add.text(12, 36, controls.join('\n'), {
			fontSize: '11px',
			color: '#d0d0d0',
			lineSpacing: 5,
		})

		this.controlsPanel.add([bg, title, titleText, controlsText])
	}

	private initTutorial() {
		this.tutorialOverlay = this.add.container(0, 0).setDepth(2000).setVisible(false).setScrollFactor(0)
		const bg = this.add.rectangle(0, 0, 960, 540, 0x000000, 0.85).setOrigin(0)
		const txt = this.add
			.text(480, 270, '', {
				fontSize: '20px',
				align: 'center',
				backgroundColor: '#1a1f2e',
				padding: { x: 30, y: 20 },
			})
			.setOrigin(0.5)
		bg.setInteractive().on('pointerdown', () => this.tutorialOverlay.setVisible(false))
		this.tutorialOverlay.add([bg, txt])
	}

	protected showInstruction(msg: string) {
		;(this.tutorialOverlay.getAt(1) as Phaser.GameObjects.Text).setText(msg + '\n\n[ Click to continue ]')
		this.tutorialOverlay.setVisible(true)
	}

	// --- 核心逻辑 ---
	private bindGlobalEvents() {
		// ESC key for pause menu
		this.input.keyboard?.on('keydown-ESC', (e: KeyboardEvent) => {
			e.preventDefault()
			console.log('[BaseScene] ESC pressed, toggling pause from:', this.scene.key)
			this.game.events.emit(GameEvents.togglePause, { sceneKey: this.scene.key })
		})

		// TAB key for editor
		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			setEditorContext({ sceneKey: this.scene.key })
			this.game.events.emit(GameEvents.toggleEditor)
		})

		const reg = (p: CompiledSpell) => this.world.resources.spellByEid.set(this.world.resources.playerEid, p)
		this.game.events.on(GameEvents.registerSpell, reg)
		this.events.once('shutdown', () => {
			this.game.events.off(GameEvents.registerSpell, reg)
		})
	}

	protected abstract onLevelCreate(): void
	protected onLevelUpdate() {}
}
