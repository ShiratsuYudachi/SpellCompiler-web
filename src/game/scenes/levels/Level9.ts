import { BaseScene } from '../base/BaseScene'
import { Health } from '../../components'
import { Velocity } from '../../components'
import { createRoom } from '../../utils/levelUtils'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level9Meta: LevelMeta = {
	key: 'Level9',
	playerSpawnX: 96,
	playerSpawnY: 288,
	mapData: createRoom(15, 9),
	tileSize: 64,
	editorRestrictions: /^(game::getLightColor|game::teleportRelative|game::getPlayer)$/,
	allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction', 'if'],
	objectives: [
		{
			id: 'reach-goal',
			description: 'Reach the goal point',
			type: 'reach',
		},
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'output-1', type: 'output', position: { x: 600, y: 250 }, data: { label: 'Output' } },
			{
				id: 'if-check',
				type: 'if',
				position: { x: 400, y: 250 },
				data: {},
			},
			{
				id: 'func-eq',
				type: 'dynamicFunction',
				position: { x: 200, y: 200 },
				data: {
					functionName: 'std::cmp::eq',
					displayName: '== equals',
					namespace: 'std',
					params: ['a', 'b'],
				},
			},
			{
				id: 'func-getLightColor1',
				type: 'dynamicFunction',
				position: { x: 50, y: 150 },
				data: {
					functionName: 'game::getLightColor',
					displayName: 'getLightColor',
					namespace: 'game',
					params: ['id'],
				},
			},
			{
				id: 'func-getLightColor2',
				type: 'dynamicFunction',
				position: { x: 50, y: 250 },
				data: {
					functionName: 'game::getLightColor',
					displayName: 'getLightColor',
					namespace: 'game',
					params: ['id'],
				},
			},
			{ id: 'lit-id1', type: 'literal', position: { x: -100, y: 150 }, data: { value: 1 } },
			{ id: 'lit-id2', type: 'literal', position: { x: -100, y: 250 }, data: { value: 2 } },
			{
				id: 'func-teleport',
				type: 'dynamicFunction',
				position: { x: 200, y: 350 },
				data: {
					functionName: 'game::teleportRelative',
					displayName: 'teleportRelative',
					namespace: 'game',
					params: ['entityId', 'offset'],
					parameterModes: {
						offset: {
							current: 'literal-xy',
							options: [
								{
									mode: 'literal-xy',
									label: 'Literal (dx, dy)',
									params: ['dx', 'dy'],
								},
								{
									mode: 'vector',
									label: 'Vector',
									params: ['offset'],
								},
							],
						},
					},
				},
			},
			{
				id: 'func-getPlayer',
				type: 'dynamicFunction',
				position: { x: 50, y: 400 },
				data: {
					functionName: 'game::getPlayer',
					displayName: 'getPlayer',
					namespace: 'game',
					params: [],
				},
			},
			{ id: 'lit-dx', type: 'literal', position: { x: 50, y: 480 }, data: { value: 50 } },
			{ id: 'lit-dy', type: 'literal', position: { x: 50, y: 550 }, data: { value: 0 } },
			{ id: 'lit-else', type: 'literal', position: { x: 200, y: 150 }, data: { value: 0 } },
		],
		edges: [
			{ id: 'e1', source: 'if-check', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'func-eq', target: 'if-check', targetHandle: 'condition' },
			{ id: 'e3', source: 'func-getLightColor1', target: 'func-eq', targetHandle: 'arg0' },
			{ id: 'e4', source: 'func-getLightColor2', target: 'func-eq', targetHandle: 'arg1' },
			{ id: 'e5', source: 'lit-id1', target: 'func-getLightColor1', targetHandle: 'arg0' },
			{ id: 'e6', source: 'lit-id2', target: 'func-getLightColor2', targetHandle: 'arg0' },
			{ id: 'e7', source: 'func-teleport', target: 'if-check', targetHandle: 'then' },
			{ id: 'e8', source: 'func-getPlayer', target: 'func-teleport', targetHandle: 'arg0' },
			{ id: 'e9', source: 'lit-dx', target: 'func-teleport', targetHandle: 'arg1' },
			{ id: 'e10', source: 'lit-dy', target: 'func-teleport', targetHandle: 'arg2' },
			{ id: 'e11', source: 'lit-else', target: 'if-check', targetHandle: 'else' },
		],
	},
}

levelRegistry.register(Level9Meta)

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
