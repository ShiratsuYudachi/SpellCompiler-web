import { BaseScene } from '../base/BaseScene'
import { Health } from '../../components'

interface Chest {
	sprite: Phaser.GameObjects.Image
	isOpen: boolean
	x: number
	y: number
	item?: boolean // true if chest contains treasure, false if chest contains bomb
	opened: boolean // Track if chest has been opened to prevent multiple triggers
}

export class Level6 extends BaseScene {
	private chests: Chest[] = []
	private readonly CHEST_OPEN_DISTANCE = 30 // Distance to open chest
	private levelCompleted = false // Prevent multiple completion triggers

	constructor() {
		super({ key: 'Level6' })
	}

	preload() {
		// Load chest sprite sheet (first half: closed, second half: open)
		// The image should be 2 frames horizontally arranged
		// Frame 0: closed chest (left half)
		// Frame 1: open chest (right half)
		// Adjust frameWidth and frameHeight based on your actual image dimensions
		// If the image is 128x64 (2 frames of 64x64), use frameWidth: 64
		// If the image is arranged vertically, adjust accordingly
		this.load.spritesheet('chest', '/assets/level6/chest.png', {
			frameWidth: 32, // Adjust based on actual image size (half of total width if horizontal)
			frameHeight: 32, // Adjust based on actual image size
			startFrame: 0,
			endFrame: 1,
		})
	}

	protected onLevelCreate(): void {
		// Set camera to follow player
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// Initialize player health to 100%
		const playerEid = this.world.resources.playerEid
		Health.max[playerEid] = 100
		Health.current[playerEid] = 100

		// Create chests in the level
		this.createChests()

		// Store chests reference in world resources for game functions to access
		this.world.resources.levelData = {
			...this.world.resources.levelData,
			chests: this.chests,
			chestOpenDistance: this.CHEST_OPEN_DISTANCE,
		}
	}

	protected onLevelUpdate(): void {
		// Check player distance to chests and update their state
		this.updateChestStates()
	}

	private createChests() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540

		// Define chest positions (you can adjust these)
		const chestPositions = [
			{ x: 600, y: 90 },
			{ x: 600, y: 180 },
			{ x: 600, y: 270 },
			{ x: 600, y: 360 },
			{ x: 600, y: 450 },
		]

		// Randomly assign one treasure chest, rest are bombs
		// You can modify this logic to customize which chests contain what
		const treasureIndex = Math.floor(Math.random() * chestPositions.length)

		chestPositions.forEach((pos, index) => {
			// Ensure chests are within world bounds
			const x = Math.max(50, Math.min(pos.x, worldWidth - 50))
			const y = Math.max(50, Math.min(pos.y, worldHeight - 50))

			// Create chest sprite (frame 0 = closed)
			const chestSprite = this.add.image(x, y, 'chest', 0)
			chestSprite.setOrigin(0.5, 0.5)

			// Assign item: true = treasure, false = bomb
			const isTreasure = index === treasureIndex

			this.chests.push({
				sprite: chestSprite,
				isOpen: false,
				opened: false,
				x,
				y,
				item: isTreasure,
			})
		})
	}

	private updateChestStates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		// Prevent further processing if level is already completed
		if (this.levelCompleted) return

		this.chests.forEach((chest) => {
			const distance = Phaser.Math.Distance.Between(
				playerBody.x,
				playerBody.y,
				chest.x,
				chest.y
			)

			// Close chest if player moves away (only if not opened yet)
			if (distance >= this.CHEST_OPEN_DISTANCE && chest.isOpen && !chest.opened) {
				chest.isOpen = false
				chest.sprite.setFrame(0)
			}

			// Open chest if player is close and chest is not already open, and press E
			const eKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E)
			if (eKey?.isDown) {
				if (distance < this.CHEST_OPEN_DISTANCE && !chest.isOpen && !chest.opened) {
					chest.isOpen = true
					chest.opened = true
					chest.sprite.setFrame(1) // Switch to open frame (second half)

					// Handle chest content
					this.handleChestContent(chest)
				}
			}
		})
	}

	private handleChestContent(chest: Chest) {
		if (chest.item === true) {
			// Player found treasure - complete the level
			this.showInstruction('Treasure found! Level Complete!')
			this.levelCompleted = true

			// Use the framework's level completion method
			this.onAllObjectivesComplete()
		} else if (chest.item === false) {
			// Player triggered bomb - reduce health by 50%
			const playerEid = this.world.resources.playerEid
			const currentHealth = Health.current[playerEid] || 100
			const maxHealth = Health.max[playerEid] || 100
			
			// Reduce health by 50% of max health
			const damage = maxHealth * 0.5
			const newHealth = Math.max(0, currentHealth - damage)
			Health.current[playerEid] = newHealth

			// Visual feedback: screen flash and player tint
			const playerBody = this.world.resources.bodies.get(playerEid)
			if (playerBody) {
				playerBody.setTint(0xff0000) // Red tint
				this.time.delayedCall(200, () => {
					if (playerBody && playerBody.active) {
						playerBody.clearTint()
					}
				})
			}
			this.cameras.main.shake(300, 0.02)

			// Check if player is dead
			if (newHealth <= 0) {
				// Player is dead - restart the level
				this.showInstruction('Bomb! You died. Restarting...')
				this.time.delayedCall(1500, () => {
					this.scene.restart()
				})
			} else {
				// Player survived - show remaining health
				const healthPercent = Math.round((newHealth / maxHealth) * 100)
				this.showInstruction(`Bomb! Health: ${healthPercent}% (Can survive ${Math.floor(newHealth / damage)} more hit(s))`)
			}
		}
	}
}
