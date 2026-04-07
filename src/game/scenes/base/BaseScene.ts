import Phaser from 'phaser'
import { GameEvents } from '../../events'
import { createGameWorld, updateGameWorld, type GameWorld } from '../../gameWorld'
import { levelRegistry } from '../../levels/LevelRegistry'
import { TerrainType, type ObjectiveConfig } from './TerrainTypes'
import { TerrainRenderer } from './TerrainRenderer'
import { Health, Enemy } from '../../components'
import { LevelProgress } from './LevelProgress'
import { setupInputEventListeners, cleanupInputEventListeners, emitTickEvent } from '../../systems/inputEventSystem'
import { eventProcessSystem, processHoldEvents } from '../../systems/eventProcessSystem'
import { PlayerVisual } from '../../EntityVisual'
import { panelBg, panelBorder } from '../../ui/inGameTextStyle'
import { patchLevelHud, resetLevelHud, setLevelHudVisible } from '../../ui/gameDomUiStore'

export abstract class BaseScene extends Phaser.Scene {
	protected world!: GameWorld
	protected platforms!: Phaser.Physics.Arcade.StaticGroup
	protected hazards: Phaser.GameObjects.Rectangle[] = []
	protected objectives: Map<string, { sprite: Phaser.GameObjects.Arc; config: ObjectiveConfig }> = new Map()
	protected terrainRenderer!: TerrainRenderer
	protected allObjectives: ObjectiveConfig[] = [] // All objectives

	// UI components (DOM text via LevelHudOverlay; Phaser draws bars/minimap only)
	private hpBar!: Phaser.GameObjects.Graphics

	// Player visual (knight helmet)
	private playerVisual?: PlayerVisual

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

	preload() {
		this.load.image('enemy', (import.meta.env.BASE_URL || '/') + 'assets/enemy.png')
	}

	create() {
		const config = levelRegistry.get(this.scene.key)

		// Compute dynamic world size
		if (config?.mapData) {
			const tileSize = config.tileSize || 64
			this.worldWidth = config.mapData[0].length * tileSize
			this.worldHeight = config.mapData.length * tileSize
		}

		// Physics world setup
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight)
		this.cameras.main.setBounds(0, 0, this.worldWidth, this.worldHeight)

		const spawnX = this.data.get('playerSpawnX') ?? config?.playerSpawnX ?? 200
		const spawnY = this.data.get('playerSpawnY') ?? config?.playerSpawnY ?? 270

		this.world = createGameWorld(this, spawnX, spawnY, false)
		this.platforms = this.physics.add.staticGroup()
		this.hazards = []
		this.objectives.clear()
		this.terrainRenderer = new TerrainRenderer(this)

		// Spell cast limit init
		if (config?.maxSpellCasts !== undefined) {
			this.world.resources.levelData!['_maxSpellCasts'] = config.maxSpellCasts
			this.world.resources.levelData!['_spellCastCount'] = 0
		}

		// Generate terrain
		if (config?.mapData) {
			this.generateTerrain(config.mapData, config.tileSize || 64)
		}

		// Collision
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.physics.add.collider(playerBody, this.platforms)
			playerBody.setCollideWorldBounds(true)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)

			// Hide the plain blue square; replace with knight helmet visual
			playerBody.setAlpha(0)
			this.playerVisual?.destroy()
			this.playerVisual = new PlayerVisual(this, playerBody.x, playerBody.y)
		}

		const dismissTut = () => patchLevelHud({ tutorialVisible: false })
		this.game.events.on(GameEvents.dismissTutorial, dismissTut)

		// Clean up playerVisual + DOM HUD on scene shutdown / restart
		this.events.once('shutdown', () => {
			this.playerVisual?.destroy()
			this.playerVisual = undefined
			this.game.events.off(GameEvents.dismissTutorial, dismissTut)
			cleanupInputEventListeners(this)
			resetLevelHud()
		})

		this.initPlayerHUD()
		this.initMinimap()

		setLevelHudVisible(true)
		patchLevelHud({
			taskTitle: 'OBJECTIVE',
			taskBody: '',
			controlsLeft: 'Tab  →  Toggle Editor\nESC  →  Pause Menu',
			minimapTitle: 'MINIMAP',
			tutorialVisible: false,
			survivalTimerVisible: false,
			bossHud: null,
			banner: null,
		})

		// Init progressive objectives
		if (config?.objectives) {
			this.initProgressiveObjectives(config.objectives)
		}

		// Editor and spell events
		this.bindGlobalEvents()

		// Set up event system input listeners
		setupInputEventListeners(this)

		this.onLevelCreate()
	}

	update() {
		updateGameWorld(this.world, this.game.loop.delta / 1000)

		// Process event system
		emitTickEvent()
		eventProcessSystem(this.world)
		processHoldEvents(this.world)

		// Sync player helmet to physics body position
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody && this.playerVisual) {
			this.playerVisual.syncTo(playerBody.x, playerBody.y)
		}

		this.updatePlayerHUD()
		this.updateCastCountHUD()
		this.updateMinimap()
		this.updateHazards()
		this.updateObjectives()
		this.updatePressurePlates()
		this.onLevelUpdate()
	}

	// --- Progressive objective system ---
	private initProgressiveObjectives(objectives: ObjectiveConfig[]) {
		this.allObjectives = objectives.map(obj => ({
			...obj,
			completed: false,
			visible: !obj.prerequisite
		}))

		this.updateTaskDisplay()
	}

	private updateTaskDisplay() {
		const currentTask = this.allObjectives.find(obj => obj.visible && !obj.completed)

		if (currentTask) {
			patchLevelHud({ taskBody: `☐ ${currentTask.description}` })
		} else if (this.allObjectives.every(obj => obj.completed)) {
			patchLevelHud({ taskBody: '✓ All objectives complete!' })
		} else {
			patchLevelHud({ taskBody: '' })
		}
	}

	private unlockNextObjective(completedId: string) {
		this.allObjectives.forEach(obj => {
			if (obj.prerequisite === completedId) {
				obj.visible = true
			}
		})

		this.updateTaskDisplay()
	}

	// Subclasses can complete objectives manually
	protected completeObjectiveById(id: string) {
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task && !task.completed) {
			task.completed = true
			this.unlockNextObjective(id)
			this.updateTaskDisplay()

			// Check if all complete
			if (this.allObjectives.every(obj => obj.completed)) {
				this.onAllObjectivesComplete()
			}
		}
	}

	// Update task description (for progress display)
	protected updateObjectiveDescription(id: string, newDescription: string) {
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task) {
			task.description = newDescription
			this.updateTaskDisplay()
		}
	}

	// --- Terrain generator ---
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
					case TerrainType.PRESSURE_PLATE_RED:
						this.createPressurePlate(posX, posY, size, 'RED')
						break
					case TerrainType.PRESSURE_PLATE_YELLOW:
						this.createPressurePlate(posX, posY, size, 'YELLOW')
						break
					case TerrainType.SENSOR:
						this.createSensor(posX, posY, size)
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
		// Add walls to world.resources.walls for fireball collision
		this.world.resources.walls.push(wall)
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

	/**
	 * Create pressure plate
	 */
	private createPressurePlate(x: number, y: number, size: number, color: 'RED' | 'YELLOW') {
		// Render pressure plate
		if (color === 'RED') {
			this.terrainRenderer.renderPressurePlateRed(x, y, size)
		} else {
			this.terrainRenderer.renderPressurePlateYellow(x, y, size)
		}

		// Create collision area (invisible)
		const plateHeight = size / 4
		const rect = this.add.rectangle(x, y, size - 12, plateHeight, 0x000000, 0)

		// Store pressure plate info
		this.world.resources.pressurePlates.push({
			x,
			y,
			width: size - 12,
			height: plateHeight,
			color,
			rect,
		})
	}

	/**
	 * Create sensor
	 */
	private createSensor(x: number, y: number, size: number) {
		// Render sensor
		this.terrainRenderer.renderSensor(x, y, size)

		// Create collision area (invisible)
		const rect = this.add.rectangle(x, y, size / 2 - 8, size - 16, 0x000000, 0)

		// Store sensor info
		this.world.resources.sensors.push({
			x,
			y,
			width: size / 2 - 8,
			height: size - 16,
			active: true,
			rect,
		})
	}

	// --- Hazard zone update ---
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

	// --- Objective point update ---
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
		// Mark objective complete
		const task = this.allObjectives.find(obj => obj.id === id)
		if (task) {
			task.completed = true
			this.unlockNextObjective(id)
		}

		// Check if all objectives complete
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

			// Emit BEFORE pausing so Game.tsx onShowVictory can find the active scene
			// and correctly set pausedSceneRef (needed for scene cleanup on Next/Replay)
			this.game.events.emit(GameEvents.showVictory, { level: levelNum })
			this.scene.pause()
		}
	}

	// --- Pressure plate detection ---
	private updatePressurePlates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		// Reset pressure plate state
		let currentPlateColor: 'NONE' | 'RED' | 'YELLOW' = 'NONE'

		// Check if player is on pressure plate
		for (const plate of this.world.resources.pressurePlates) {
			const bounds = plate.rect.getBounds()
			if (
				playerBody.x > bounds.left &&
				playerBody.x < bounds.right &&
				playerBody.y > bounds.top &&
				playerBody.y < bounds.bottom
			) {
				currentPlateColor = plate.color
				break
			}
		}

		// Update global state
		this.world.resources.currentPlateColor = currentPlateColor
	}

	// --- UI system ---
	private initPlayerHUD() {
		const x = 20
		const y = 20
		const barWidth = 200
		const barHeight = 20

		this.add.rectangle(x, y, barWidth, barHeight, 0x000000, 0.7).setOrigin(0).setScrollFactor(0).setDepth(1000)
		this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(1001)

		this.events.on('spell-cast-limit-reached', (max: number) => {
			patchLevelHud({
				castVisible: true,
				castLine: `✨ Spells: 0/${max} — No casts left!`,
				castWarning: true,
			})
			this.time.delayedCall(800, () => {
				patchLevelHud({ castWarning: false })
			})
		})
	}

	private updateCastCountHUD() {
		const levelData = this.world.resources.levelData
		const maxCasts = levelData?.['_maxSpellCasts'] as number | undefined
		if (maxCasts === undefined) {
			patchLevelHud({ castVisible: false })
			return
		}
		const usedCasts = (levelData!['_spellCastCount'] as number) ?? 0
		const remaining = maxCasts - usedCasts
		patchLevelHud({
			castVisible: true,
			castLine: `✨ Spells: ${remaining}/${maxCasts}`,
			castWarning: false,
		})
	}

	private updatePlayerHUD() {
		const playerEid = this.world.resources.playerEid
		const currentHP = Health.current[playerEid] || 100
		const maxHP = Health.max[playerEid] || 100

		const hpPercent = currentHP / maxHP
		this.hpBar.clear()
		this.hpBar.fillStyle(0xff0000, 0.8)
		this.hpBar.fillRect(20, 20, 200 * hpPercent, 20)
		patchLevelHud({
			hpLine: `HP: ${Math.ceil(currentHP)}/${maxHP}`,
			hpPercent,
		})
	}

	private initMinimap() {
		const size = 150
		const x = 960 - size - 20
		const y = 540 - size - 20

		this.minimapContainer = this.add.container(x, y).setScrollFactor(0).setDepth(1000)

		this.minimapBg = this.add.graphics()
		this.minimapBg.fillStyle(0x000000, 0.82)
		this.minimapBg.fillRoundedRect(0, 0, size, size, 8)
		this.minimapBg.lineStyle(2, panelBorder, 0.85)
		this.minimapBg.strokeRoundedRect(0, 0, size, size, 8)

		this.minimapPlayerDot = this.add.circle(0, 0, 4, 0x00ff00)

		this.minimapContainer.add([this.minimapBg, this.minimapPlayerDot])
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

	protected setTaskInfo(_title: string, steps: string[]) {
		patchLevelHud({ taskBody: steps.join('\n') })
	}

	protected showInstruction(msg: string) {
		patchLevelHud({
			tutorialVisible: true,
			tutorialBody: `${msg}\n\n[ Click to dismiss ]`,
		})
	}

	// --- Core logic ---
	private bindGlobalEvents() {
		// ESC key for pause menu
		this.input.keyboard?.on('keydown-ESC', (e: KeyboardEvent) => {
			e.preventDefault()
			console.log('[BaseScene] ESC pressed, toggling pause from:', this.scene.key)
			this.game.events.emit(GameEvents.togglePause, { sceneKey: this.scene.key })
		})

		// TAB key for editor (sceneKey on event so Game.tsx does not rely on getScenes while paused)
		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor, { sceneKey: this.scene.key })
		})

		this.events.once('shutdown', () => {
			// Cleanup if needed
		})
	}

	protected abstract onLevelCreate(): void
	protected onLevelUpdate() {}
}
