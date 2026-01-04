import Phaser from 'phaser'
import { addComponent } from 'bitecs'
import { GameEvents } from '../events'
import type { CompiledSpell } from '../spells/types'
import { createGameWorld, updateGameWorld, type GameWorld, spawnEntity } from '../gameWorld'
import { getPlayerSpawnPosition, getSceneGates, getPlayerSpawnNearGate, type GateConfig } from './sceneConfig'
import { createRectBody } from '../prefabs/createRectBody'
import { Velocity, Enemy, Health, Sprite } from '../components'

export class Scene1 extends Phaser.Scene {
	constructor() {
		super({ key: 'Scene1' })
	}
	private world!: GameWorld
	private gates: Phaser.Physics.Arcade.Image[] = []
	private gateOverlapsSet = false
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
	private minimapScale = 0.1 // Scale factor for minimap (10% of world size, smaller default)
	private minimapWidth = 0
	private minimapHeight = 0
	private minimapPlayerDot!: Phaser.GameObjects.Arc
	private minimapTargetDots: Phaser.GameObjects.Arc[] = []
	private minimapBackground!: Phaser.GameObjects.Rectangle
	private minimapWorldBorder!: Phaser.GameObjects.Rectangle
	private minimapResizeHandle!: Phaser.GameObjects.Rectangle
	private isResizingMinimap = false
	private minimapMinScale = 0.05 // Minimum scale (5%)
	private minimapMaxScale = 0.25 // Maximum scale (25%)
	private bossEid: number | null = null
	private bossDefeated = false
	private locationCollectionUnlocked = false
	private instructionText!: Phaser.GameObjects.Text
	private bossCoordText!: Phaser.GameObjects.Text

	private onRegisterSpell = (payload: CompiledSpell) => {
		const playerEid = this.world.resources.playerEid
		this.world.resources.spellByEid.set(playerEid, payload)
		this.world.resources.spellMessageByEid.set(playerEid, 'Spell equipped. Press 1 to cast.')
	}

	init(data?: { playerX?: number; playerY?: number }) {
		// Store spawn position from scene data
		this.data.set('playerSpawnX', data?.playerX)
		this.data.set('playerSpawnY', data?.playerY)
	}

	create() {

		// Reset flags and arrays when scene is created/restarted
		this.gateOverlapsSet = false
		this.targetCollisionsSet = false
		this.gates = []
		this.teleportTargets = []
		this.bossEid = null
		this.bossDefeated = false
		this.locationCollectionUnlocked = false
		// Clean up minimap if it exists
		if (this.minimapContainer) {
			this.minimapContainer.destroy()
		}
		this.minimapTargetDots = []

		// Different background color to distinguish from MainScene
		this.cameras.main.setBackgroundColor('#2a1b1f')
		
		// Enlarge Scene1 world bounds (3x larger than default: 2880x1620)
		const worldWidth = 2880
		const worldHeight = 1620
		this.physics.world.setBounds(0, 0, worldWidth, worldHeight)

		// Get player spawn position (from scene data or default)
		const spawnX = this.data.get('playerSpawnX') ?? getPlayerSpawnPosition('Scene1').x
		const spawnY = this.data.get('playerSpawnY') ?? getPlayerSpawnPosition('Scene1').y

		this.world = createGameWorld(this, spawnX, spawnY, false)

		// Initialize score for Scene1
		this.world.resources.score = 0
		this.bossDefeated = false
		this.locationCollectionUnlocked = false

		// Set up camera to follow player (only after player is created)
		this.time.delayedCall(0, () => {
			const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
			if (playerBody) {
				this.cameras.main.startFollow(playerBody, true, 0.1, 0.1) // Smooth camera follow
				this.cameras.main.setBounds(0, 0, worldWidth, worldHeight) // Camera bounds match world bounds
			}
		})

		// Create gates from configuration
		const gateConfigs = getSceneGates('Scene1')
		this.gates = this.createGates(gateConfigs)

		// Set up collision detection immediately after gates are created
		this.setupGateCollisions()

		// Create boss near player (static, no AI - must be defeated with melee)
		// Boss position will be set after player is created
		this.time.delayedCall(0, () => {
			this.createBoss()
		})

		// Create teleport target locations for players to use teleportRelative
		this.createTeleportTargets()
		// Initially hide all teleport targets until boss is defeated
		this.setTeleportTargetsVisible(false)

		// Create minimap
		this.createMinimap()

		// Tab key to toggle editor (same as MainScene)
		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor)
			// Emit scene context for editor restrictions (defer to avoid React warning)
			setTimeout(() => {
				this.game.events.emit(GameEvents.setEditorContext, { sceneKey: 'Scene1' })
			}, 0)
		})

		// DISABLE fireball shooting in Scene1 - removed pointerdown handler

		this.game.events.on(GameEvents.registerSpell, this.onRegisterSpell)
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(GameEvents.registerSpell, this.onRegisterSpell)
		})
	}

	update() {
		updateGameWorld(this.world, this.game.loop.delta / 1000)
		
		const playerEid = this.world.resources.playerEid
		
		// Check if boss is defeated
		if (this.bossEid !== null && !this.bossDefeated) {
			const bossHealth = Health.current[this.bossEid]
			if (bossHealth <= 0) {
				this.onBossDefeated()
			}
		}
		
		// Disable player movement in Task 1 (before boss is defeated)
		// Player can only use teleportRelative to move
		if (!this.bossDefeated) {
			// Disable player movement by setting velocity to 0
			// This overrides any input from playerInputSystem
			Velocity.x[playerEid] = 0
			Velocity.y[playerEid] = 0
			
			// Also set the physical body velocity to 0 to ensure no movement
			const playerBody = this.world.resources.bodies.get(playerEid)
			if (playerBody) {
				playerBody.setVelocity(0, 0)
			}
		} else {
			// In Task 2, disable movement if less than 3 locations collected
			const collectedCount = this.teleportTargets.filter((t) => t.collected).length
			if (this.locationCollectionUnlocked && collectedCount < 3) {
				// Disable player movement by setting velocity to 0
				Velocity.x[playerEid] = 0
				Velocity.y[playerEid] = 0
				
				const playerBody = this.world.resources.bodies.get(playerEid)
				if (playerBody) {
					playerBody.setVelocity(0, 0)
				}
			}
		}

		// Update dynamic dx/dy coordinates for all non-collected targets (only if unlocked)
		if (this.locationCollectionUnlocked) {
			this.updateTargetCoordinates()
		}

		// Update boss coordinates (always show if boss exists and not defeated)
		if (this.bossEid !== null && !this.bossDefeated && this.bossCoordText) {
			this.updateBossCoordinates()
		}

		// Update minimap
		this.updateMinimap()

		// Update HUD with score
		this.updateHud()
	}

	private setupGateCollisions() {
		if (this.gateOverlapsSet || this.gates.length === 0) {
			return
		}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			// Retry in next frame if player body is not ready
			this.time.delayedCall(0, () => this.setupGateCollisions())
			return
		}

		this.gates.forEach((gate, index) => {
			const gateConfig = getSceneGates('Scene1')[index]
			if (gateConfig) {
				this.physics.add.overlap(playerBody, gate, () => {
					// Get spawn position near the target gate in the target scene
					const targetSpawn = getPlayerSpawnNearGate(gateConfig.targetScene, 0)
					this.scene.start(gateConfig.targetScene, {
						playerX: targetSpawn.x,
						playerY: targetSpawn.y,
					})
				})
			}
		})

		this.gateOverlapsSet = true
	}

	private createGates(gateConfigs: GateConfig[]): Phaser.Physics.Arcade.Image[] {
		const gates: Phaser.Physics.Arcade.Image[] = []

		gateConfigs.forEach((config, index) => {
			// Use unique texture key for each gate to avoid conflicts
			const textureKey = `gate-${this.scene.key}-${index}`
			const gate = createRectBody(this, textureKey, config.color, config.width, config.height, config.x, config.y, 1)
			gate.setImmovable(true)
			gate.setTint(config.color)

			// Add text label above the gate
			const gateText = this.add.text(config.x, config.y - 70, config.label, {
				fontSize: '16px',
				color: '#ffffff',
				align: 'center',
			})
			gateText.setOrigin(0.5, 0.5)

			gates.push(gate)
		})

		return gates
	}

	/**
	 * Create a static boss that can only be defeated with melee
	 * Boss is positioned near the player spawn location
	 */
	private createBoss() {
		// Get player position to place boss nearby
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			// Retry if player not ready
			this.time.delayedCall(0, () => this.createBoss())
			return
		}

		// Place boss to the right of player, slightly offset
		const bossX = playerBody.x + 200 // 200 pixels to the right
		const bossY = playerBody.y // Same Y level

		// Create boss body (larger than normal enemy)
		const bossBody = createRectBody(this, 'boss-rect', 0xff0000, 64, 64, bossX, bossY, 5)
		bossBody.setImmovable(true)
		bossBody.setTint(0xff0000)

		this.bossEid = spawnEntity(this.world)
		this.world.resources.bodies.set(this.bossEid, bossBody)

		// Add components (NO EnemyAI - boss doesn't move or attack)
		addComponent(this.world, this.bossEid, Sprite)
		addComponent(this.world, this.bossEid, Enemy)
		addComponent(this.world, this.bossEid, Health)

		// Set boss stats
		Health.max[this.bossEid] = 100
		Health.current[this.bossEid] = 100

		// Add boss label
		const bossLabel = this.add.text(bossX, bossY - 80, 'BOSS', {
			fontSize: '24px',
			color: '#ff0000',
			fontStyle: 'bold',
		})
		bossLabel.setOrigin(0.5, 0.5)
		bossLabel.setDepth(10)
		
		// Add boss coordinate text (will be updated dynamically)
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
		
		// Store boss label reference for cleanup
		this.data.set('bossLabel', bossLabel)
	}

	/**
	 * Handle boss defeat
	 */
	private onBossDefeated() {
		this.bossDefeated = true
		this.locationCollectionUnlocked = true

		// Show all teleport targets
		this.setTeleportTargetsVisible(true)

		// Set up collision detection for teleport targets
		this.setupTargetCollisions()

		// Remove boss body and label
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

		// Show victory message
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

		// Fade out after 3 seconds
		this.tweens.add({
			targets: victoryText,
			alpha: 0,
			duration: 3000,
			onComplete: () => victoryText.destroy(),
		})

		// Update instruction text
		if (this.instructionText) {
			this.instructionText.setText('Task 2: Use teleportRelative(dx,dy) to collect locations | Collect 3 to unlock movement')
		}
	}

	/**
	 * Show or hide all teleport targets
	 */
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

	/**
	 * Create visible teleport target locations
	 * Players need to use teleportRelative spell to move to these locations
	 */
	private createTeleportTargets() {
		// Define teleport target positions distributed across the enlarged world
		// Format: { x, y, label, relativeOffset }
		// relativeOffset is the dx, dy needed from spawn position
		const targets = [
			// Near spawn area (original 960x540 area)
			{ x: 480, y: 270, label: 'Center', relativeOffset: { dx: 440, dy: 0 } },
			{ x: 200, y: 270, label: 'Left Center', relativeOffset: { dx: 160, dy: 0 } },
			{ x: 760, y: 270, label: 'Right Center', relativeOffset: { dx: 720, dy: 0 } },
			{ x: 480, y: 100, label: 'Top Center', relativeOffset: { dx: 440, dy: -170 } },
			{ x: 480, y: 440, label: 'Bottom Center', relativeOffset: { dx: 440, dy: 170 } },
			
			// Extended area (beyond original bounds)
			{ x: 1440, y: 270, label: 'Far Right', relativeOffset: { dx: 1400, dy: 0 } },
			{ x: 1440, y: 810, label: 'Far Bottom Right', relativeOffset: { dx: 1400, dy: 540 } },
			{ x: 2400, y: 270, label: 'Extreme Right', relativeOffset: { dx: 2360, dy: 0 } },
			{ x: 2400, y: 810, label: 'Extreme Bottom Right', relativeOffset: { dx: 2360, dy: 540 } },
			{ x: 1440, y: 1350, label: 'Far Bottom', relativeOffset: { dx: 1400, dy: 1080 } },
			{ x: 2400, y: 1350, label: 'Extreme Bottom', relativeOffset: { dx: 2360, dy: 1080 } },
		]

		// Create texture for collector if it doesn't exist (do this once before the loop)
		if (!this.textures.exists('collector-point')) {
			const g = this.add.graphics()
			g.fillStyle(0xffffff, 1)
			g.fillCircle(0, 0, 20)
			g.generateTexture('collector-point', 40, 40)
			g.destroy()
		}

		targets.forEach((target) => {
			// Create a visible marker (circle) at the target location
			const marker = this.add.circle(target.x, target.y, 20, 0x00ffff, 0.6) // Cyan circle with transparency
			marker.setStrokeStyle(2, 0x00ffff, 1) // Cyan border
			marker.setDepth(2) // Above most objects

			// Add pulsing animation to make it more visible
			this.tweens.add({
				targets: marker,
				scaleX: 1.3,
				scaleY: 1.3,
				duration: 1000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			})

			// Create a physics body for collision detection (invisible, slightly larger than marker)
			const collector = this.physics.add.image(target.x, target.y, 'collector-point')
			collector.setDisplaySize(40, 40) // Slightly larger than marker for easier collection
			collector.setAlpha(0) // Make it invisible
			collector.setImmovable(true)

			// Create label text showing the location name
			const labelText = this.add.text(target.x, target.y - 50, target.label, {
				fontSize: '14px',
				color: '#00ffff',
				align: 'center',
				fontStyle: 'bold',
			})
			labelText.setOrigin(0.5, 0.5)
			labelText.setDepth(3)

			// Create coordinate text showing dx, dy values for teleportRelative
			// Initial values will be calculated dynamically in update()
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

		// Add instruction text at the bottom left (fixed to camera, not world)
		this.instructionText = this.add.text(20, 520, 'Task 1: Use teleportRelative(dx,dy) to get near the boss, then use melee (Space) to defeat it', {
			fontSize: '12px',
			color: '#ffff00',
			align: 'left',
			fontStyle: 'bold',
			backgroundColor: '#000000',
			padding: { x: 8, y: 4 },
		})
		this.instructionText.setOrigin(0, 1) // Bottom left origin
		this.instructionText.setDepth(4)
		this.instructionText.setScrollFactor(0) // Fixed to camera, not world
	}

	/**
	 * Set up collision detection between player and teleport targets
	 * When player overlaps with a target, collect it and award points
	 */
	private setupTargetCollisions() {
		if (this.targetCollisionsSet || this.teleportTargets.length === 0) {
			return
		}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			// Retry in next frame if player body is not ready
			this.time.delayedCall(0, () => this.setupTargetCollisions())
			return
		}

		this.teleportTargets.forEach((target) => {
			if (target.collected) {
				return // Skip already collected targets
			}

			this.physics.add.overlap(playerBody, target.collector, () => {
				this.collectTarget(target)
			})
		})

		this.targetCollisionsSet = true
	}

	/**
	 * Collect a teleport target: award points, remove visual elements, show feedback
	 */
	private collectTarget(target: {
		x: number
		y: number
		label: string
		marker: Phaser.GameObjects.Arc
		labelText: Phaser.GameObjects.Text
		coordText: Phaser.GameObjects.Text
		collector: Phaser.Physics.Arcade.Image
		collected: boolean
	}) {
		if (target.collected) {
			return // Already collected
		}

		// Mark as collected
		target.collected = true

		// Award points (10 points per target)
		const points = 10
		this.world.resources.score = (this.world.resources.score || 0) + points

		// Show collection feedback
		const feedbackText = this.add.text(target.x, target.y, `+${points}`, {
			fontSize: '24px',
			color: '#00ff00',
			fontStyle: 'bold',
		})
		feedbackText.setOrigin(0.5, 0.5)
		feedbackText.setDepth(5)

		// Animate feedback text (fade out and move up)
		this.tweens.add({
			targets: feedbackText,
			y: target.y - 50,
			alpha: 0,
			duration: 1000,
			ease: 'Power2',
			onComplete: () => {
				feedbackText.destroy()
			},
		})

		// Remove visual elements with animation
		this.tweens.add({
			targets: [target.marker, target.labelText, target.coordText],
			alpha: 0,
			scaleX: 0,
			scaleY: 0,
			duration: 300,
			ease: 'Back.easeIn',
			onComplete: () => {
				target.marker.destroy()
				target.labelText.destroy()
				target.coordText.destroy()
				target.collector.destroy()
			},
		})

		// Update HUD
		this.updateHud()
	}

	/**
	 * Update boss dx/dy coordinates based on player's current position
	 */
	private updateBossCoordinates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody || !this.bossEid) {
			return
		}

		const bossBody = this.world.resources.bodies.get(this.bossEid)
		if (!bossBody || !this.bossCoordText) {
			return
		}

		const playerX = playerBody.x
		const playerY = playerBody.y

		// Calculate relative offset from player's current position to boss
		const dx = Math.round(bossBody.x - playerX)
		const dy = Math.round(bossBody.y - playerY)

		// Update the coordinate text
		this.bossCoordText.setText(`dx: ${dx}\ndy: ${dy}`)
		this.bossCoordText.setPosition(bossBody.x, bossBody.y + 50)
	}

	/**
	 * Update dx/dy coordinates for all non-collected targets based on player's current position
	 */
	private updateTargetCoordinates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			return
		}

		const playerX = playerBody.x
		const playerY = playerBody.y

		// Update coordinate text for all non-collected targets
		this.teleportTargets.forEach((target) => {
			if (target.collected) {
				return // Skip collected targets
			}

			// Calculate relative offset from player's current position
			const dx = Math.round(target.x - playerX)
			const dy = Math.round(target.y - playerY)

			// Update the coordinate text
			target.coordText.setText(`dx: ${dx}\ndy: ${dy}`)
		})
	}

	/**
	 * Create minimap in the top right corner with resize functionality
	 */
	private createMinimap() {
		// Calculate minimap dimensions
		this.updateMinimapSize()

		// Position in top right corner (with some padding)
		const minimapX = 960 - this.minimapWidth - 20 // 20px padding from right edge
		const minimapY = 20 // 20px padding from top edge

		// Create container for minimap
		this.minimapContainer = this.add.container(minimapX, minimapY)
		this.minimapContainer.setScrollFactor(0) // Fixed to camera
		this.minimapContainer.setDepth(100) // Above everything

		// Create background
		this.minimapBackground = this.add.rectangle(
			this.minimapWidth / 2,
			this.minimapHeight / 2,
			this.minimapWidth + 10,
			this.minimapHeight + 10,
			0x000000,
			0.7
		)
		this.minimapBackground.setStrokeStyle(2, 0xffffff, 1)
		this.minimapBackground.setInteractive({ useHandCursor: true })
		this.minimapContainer.add(this.minimapBackground)

		// Create world border
		this.minimapWorldBorder = this.add.rectangle(
			this.minimapWidth / 2,
			this.minimapHeight / 2,
			this.minimapWidth,
			this.minimapHeight,
			0x333333,
			0.3
		)
		this.minimapWorldBorder.setStrokeStyle(1, 0x666666, 1)
		this.minimapContainer.add(this.minimapWorldBorder)

		// Create resize handle (bottom right corner)
		const handleSize = 12
		this.minimapResizeHandle = this.add.rectangle(
			this.minimapWidth + 5,
			this.minimapHeight + 5,
			handleSize,
			handleSize,
			0xffffff,
			0.8
		)
		this.minimapResizeHandle.setStrokeStyle(1, 0xcccccc, 1)
		this.minimapResizeHandle.setInteractive({ useHandCursor: true })
		this.minimapContainer.add(this.minimapResizeHandle)

		// Add resize functionality
		this.minimapResizeHandle.on('pointerdown', () => {
			this.isResizingMinimap = true
		})

		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			if (this.isResizingMinimap) {
				// Calculate new scale based on mouse position relative to minimap container
				const containerX = this.minimapContainer.x
				const containerY = this.minimapContainer.y
				const relativeX = pointer.x - containerX
				const relativeY = pointer.y - containerY
				
				// Calculate scale based on distance from top-left corner
				const newScaleX = Math.max(
					this.minimapMinScale,
					Math.min(this.minimapMaxScale, relativeX / this.minimapWorldWidth)
				)
				const newScaleY = Math.max(
					this.minimapMinScale,
					Math.min(this.minimapMaxScale, relativeY / this.minimapWorldHeight)
				)
				
				// Use the average of X and Y scales for uniform scaling
				this.minimapScale = (newScaleX + newScaleY) / 2
				this.updateMinimapSize()
				this.refreshMinimapVisuals()
			}
		})

		this.input.on('pointerup', () => {
			if (this.isResizingMinimap) {
				this.isResizingMinimap = false
			}
		})

		// Create player dot (will be updated in updateMinimap)
		this.minimapPlayerDot = this.add.circle(0, 0, 4, 0x4a90e2, 1)
		this.minimapContainer.add(this.minimapPlayerDot)

		// Create target dots for all targets (will be updated in updateMinimap)
		// These will be created and managed dynamically
	}

	/**
	 * Update minimap size based on current scale
	 */
	private updateMinimapSize() {
		this.minimapWidth = this.minimapWorldWidth * this.minimapScale
		this.minimapHeight = this.minimapWorldHeight * this.minimapScale
	}

	/**
	 * Refresh minimap visuals after resize
	 */
	private refreshMinimapVisuals() {
		if (!this.minimapContainer) return

		// Update background size
		this.minimapBackground.setSize(this.minimapWidth + 10, this.minimapHeight + 10)
		this.minimapBackground.setPosition(this.minimapWidth / 2, this.minimapHeight / 2)

		// Update world border size
		this.minimapWorldBorder.setSize(this.minimapWidth, this.minimapHeight)
		this.minimapWorldBorder.setPosition(this.minimapWidth / 2, this.minimapHeight / 2)

		// Update resize handle position
		this.minimapResizeHandle.setPosition(this.minimapWidth + 5, this.minimapHeight + 5)

		// Reposition container to keep it in top right
		const minimapX = 960 - this.minimapWidth - 20
		const minimapY = 20
		this.minimapContainer.setPosition(minimapX, minimapY)
	}

	/**
	 * Update minimap to show player position and remaining locations
	 */
	private updateMinimap() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			return
		}

		// Update player dot position
		const playerMapX = (playerBody.x / this.minimapWorldWidth) * this.minimapWidth
		const playerMapY = (playerBody.y / this.minimapWorldHeight) * this.minimapHeight
		this.minimapPlayerDot.setPosition(playerMapX, playerMapY)

		// Remove old target dots
		this.minimapTargetDots.forEach((dot) => dot.destroy())
		this.minimapTargetDots = []

		// Create dots for all remaining (uncollected) targets (only if unlocked)
		if (this.locationCollectionUnlocked) {
			this.teleportTargets.forEach((target) => {
				if (target.collected) {
					return // Skip collected targets
				}

				// Calculate minimap position for this target
				const targetMapX = (target.x / this.minimapWorldWidth) * this.minimapWidth
				const targetMapY = (target.y / this.minimapWorldHeight) * this.minimapHeight

				// Create a dot for this target
				const dot = this.add.circle(targetMapX, targetMapY, 3, 0x00ffff, 0.8)
				dot.setStrokeStyle(1, 0x00ffff, 1)
				this.minimapContainer.add(dot)
				this.minimapTargetDots.push(dot)
			})
		}

		// Show boss on minimap if not defeated
		if (this.bossEid !== null && !this.bossDefeated) {
			const bossBody = this.world.resources.bodies.get(this.bossEid)
			if (bossBody) {
				const bossMapX = (bossBody.x / this.minimapWorldWidth) * this.minimapWidth
				const bossMapY = (bossBody.y / this.minimapWorldHeight) * this.minimapHeight
				const bossDot = this.add.circle(bossMapX, bossMapY, 5, 0xff0000, 1)
				bossDot.setStrokeStyle(2, 0xff0000, 1)
				this.minimapContainer.add(bossDot)
				this.minimapTargetDots.push(bossDot)
			}
		}
	}

	/**
	 * Update HUD to show score and remaining targets
	 */
	private updateHud() {
		const score = this.world.resources.score || 0
		const remaining = this.teleportTargets.filter((t) => !t.collected).length
		const total = this.teleportTargets.length
		const collected = total - remaining

		const playerEid = this.world.resources.playerEid
		const spellMessage = this.world.resources.spellMessageByEid.get(playerEid) || ''

		let statusMessage = ''
		if (!this.bossDefeated) {
			const bossHealth = this.bossEid !== null ? Health.current[this.bossEid] : 0
			const playerBody = this.world.resources.bodies.get(playerEid)
			let distanceToBoss = '?'
			if (playerBody && this.bossEid !== null) {
				const bossBody = this.world.resources.bodies.get(this.bossEid)
				if (bossBody) {
					const dx = bossBody.x - playerBody.x
					const dy = bossBody.y - playerBody.y
					distanceToBoss = Math.round(Math.sqrt(dx * dx + dy * dy)).toString()
				}
			}
			statusMessage = `Task 1: Defeat Boss (HP: ${bossHealth}/100, Distance: ${distanceToBoss}px) - Use teleportRelative to get close, then melee (Space)`
		} else if (this.locationCollectionUnlocked) {
			const movementStatus = collected >= 3 ? 'Movement: ENABLED ✓' : `Movement: DISABLED (Collect ${3 - collected} more location${3 - collected === 1 ? '' : 's'} to unlock)`
			statusMessage = `Task 2: Collect locations (${collected}/${total}) | ${movementStatus}`
		}
		
		this.world.resources.hudText.setText(
			[
				`Score: ${score} | ${statusMessage}`,
				'You can only use teleportRelative(dx,dy) to move!',
				'Learn how to use teleportRelative in the editor',
				'Press TAB to open editor',
				'Press 1 to cast spell',
				'Press Space for melee attack',
				spellMessage,
			].join('\n'),
		)
	}
}

