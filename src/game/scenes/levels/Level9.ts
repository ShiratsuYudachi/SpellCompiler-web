import { BaseScene } from '../base/BaseScene'
import { Health } from '../../components'
import { Velocity } from '../../components'

interface Light {
	sprite: Phaser.GameObjects.Image
	lastChangeTime: number
	ID: number
	color: 'green' | 'red' | 'yellow'
}

export class Level9 extends BaseScene {
	private Lights: Light[] = []
	private lightChangeInterval: number = 300 // Change light color every 300ms
	// @ts-ignore - Visual marker is created but not read (intentional)
	private _goalMarker!: Phaser.GameObjects.Arc
	private goalCollector: Phaser.Physics.Arcade.Image | null = null
	private playerLastX: number = 0
	private playerLastY: number = 0
	private levelCompleted = false
	constructor() {
		super({ key: 'Level9' })
	}

	preload() {
		// Load green, red, yellow light sprite sheets
		this.load.spritesheet('green_light', '/assets/level9/green_light.png', {
			frameWidth: 32,
			frameHeight: 32,
			})
		this.load.spritesheet('red_light', '/assets/level9/red_light.png', {
			frameWidth: 32,
			frameHeight: 32,
		})
		this.load.spritesheet('yellow_light', '/assets/level9/yellow_light.png', {
			frameWidth: 32,
			frameHeight: 32,
		})
	}
	protected onLevelCreate(): void {
		// Reset level state (important for scene restart)
		this.Lights = []
		this.levelCompleted = false
		this.goalCollector = null

		// Initialize player health
		const playerEid = this.world.resources.playerEid
		Health.max[playerEid] = 100
		Health.current[playerEid] = 100

		// Store player initial position
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (playerBody) {
			this.playerLastX = playerBody.x
			this.playerLastY = playerBody.y
		}

		// Create two lights at different positions
		this.createLight(600, 450)
		this.createLight(600, 250)

		// Store lights in world resources for getLightColor function
		this.world.resources.levelData = {
			...this.world.resources.levelData,
			lights: this.Lights,
		}

		// Create goal point (end point)
		this.createGoal()

		// Set task info
		this.setTaskInfo('Light Synchronization Challenge', [
			'Reach the goal point',
			'Warning: Moving when lights have different colors will reduce HP!',
			'Use getLightColor(ID) to check light colors',
			'Use if condition: if (getLightColor(1) == getLightColor(2)) then teleportRelative()',
		])
	}

	private createLight(x: number, y: number) {
		// Create initial light with random color
		const initialColor = Math.random() < 0.33 ? 'green' : Math.random() < 0.66 ? 'red' : 'yellow'
		const lightSprite = this.add.image(x, y, initialColor + '_light')
		
		// Add to Lights array with its own timestamp
		const light: Light = {
			sprite: lightSprite,
			lastChangeTime: this.time.now,
			ID: this.Lights.length + 1,
			color: initialColor,
		}
		this.Lights.push(light)

		// Update levelData reference
		if (this.world.resources.levelData) {
			this.world.resources.levelData.lights = this.Lights
		}
	}

	private changeLightColor(light: Light) {
		// Check if sprite is still valid (not destroyed)
		if (!light.sprite || !light.sprite.active || !this.time) {
			return
		}

		// Change the light's texture to a new random color
		const color = Math.random() < 0.33 ? 'green' : Math.random() < 0.66 ? 'red' : 'yellow'
		light.sprite.setTexture(color + '_light')
		light.color = color
		light.lastChangeTime = this.time.now

		// Update levelData reference
		if (this.world.resources.levelData) {
			this.world.resources.levelData.lights = this.Lights
		}
	}

	private createGoal() {
		// Create goal point at the end of the level (right side)
		const goalX = 850
		const goalY = 288

		// Create visual marker
		this._goalMarker = this.add.circle(goalX, goalY, 30, 0x00ff00, 0.4).setStrokeStyle(2, 0x00ff00)
		
		// Create invisible collector for collision detection
		this.goalCollector = this.physics.add.image(goalX, goalY, '').setVisible(false).setSize(60, 60)

		// Add overlap detection
		this.physics.add.overlap(
			this.world.resources.bodies.get(this.world.resources.playerEid)!,
			this.goalCollector,
			() => {
				if (!this.levelCompleted) {
					this.levelCompleted = true
					this.onAllObjectivesComplete()
				}
			}
		)
	}

	private getLightColorById(id: number): 'green' | 'red' | 'yellow' | null {
		const light = this.Lights.find(l => l.ID === id)
		return light ? light.color : null
	}

	protected onLevelUpdate(): void {
		// Check if time system is initialized (important for scene restart)
		if (!this.time) {
			return
		}

		// Level-specific update logic can be added here
		const currentTime = this.time.now
		
		// Update each light independently (filter out destroyed lights)
		this.Lights = this.Lights.filter(light => light.sprite && light.sprite.active)
		
		// Update levelData reference after filtering
		if (this.world.resources.levelData) {
			this.world.resources.levelData.lights = this.Lights
		}
		
		this.Lights.forEach(light => {
			if (currentTime - light.lastChangeTime >= this.lightChangeInterval) {
				this.changeLightColor(light)
			}
		})

		// Check player movement and apply damage if lights have different colors
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		
		if (playerBody && !this.levelCompleted) {
			const currentX = playerBody.x
			const currentY = playerBody.y
			
			// Check if player has moved (by checking position or velocity)
			const hasMoved = 
				Math.abs(currentX - this.playerLastX) > 1 || 
				Math.abs(currentY - this.playerLastY) > 1 ||
				Math.abs(Velocity.x[playerEid]) > 0.1 ||
				Math.abs(Velocity.y[playerEid]) > 0.1

			if (hasMoved && this.Lights.length >= 2) {
				// Check if lights have different colors
				const light1Color = this.getLightColorById(1)
				const light2Color = this.getLightColorById(2)
				
				if (light1Color && light2Color && light1Color !== light2Color) {
					// Lights have different colors - reduce HP
					const currentHealth = Health.current[playerEid] || 100
					const damage = 5 // Damage per frame when moving with different colors
					const newHealth = Math.max(0, currentHealth - damage)
					Health.current[playerEid] = newHealth

					// Visual feedback
					if (playerBody) {
						playerBody.setTint(0xff0000) // Red tint
						this.time.delayedCall(100, () => {
							if (playerBody && playerBody.active) {
								playerBody.clearTint()
							}
						})
					}

					// Check if player is dead
					if (newHealth <= 0) {
						this.showInstruction('You died! Restarting...')
						this.time.delayedCall(1500, () => {
							this.scene.restart()
						})
					}
				}
			}

			// Update last position
			this.playerLastX = currentX
			this.playerLastY = currentY
		}
	}
}