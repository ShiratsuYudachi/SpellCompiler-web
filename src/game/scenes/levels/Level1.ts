import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity, despawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite } from '../../components'
import { createCircleBody } from '../../prefabs/createCircleBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level1Meta: LevelMeta = {
	key: 'Level1',
	playerSpawnX: 120,
	playerSpawnY: 270,
	editorRestrictions: /^(game::teleportRelative|game::getPlayer)$/,
	allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction'],
	objectives: [
		{
			id: 'reach-target-1',
			description: 'Move RIGHT to the first target circle',
			type: 'reach',
		},
		{
			id: 'reach-target-2',
			description: 'Move UP to the second target circle',
			type: 'reach',
			prerequisite: 'reach-target-1',
		},
		{
			id: 'reach-target-3',
			description: 'Move DOWN-LEFT to the final target circle',
			type: 'reach',
			prerequisite: 'reach-target-2',
		},
	],

	initialSpellWorkflow: {
		nodes: [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 700, y: 220 },
				data: { label: 'Output' },
			},
			{
				id: 'func-teleport',
				type: 'dynamicFunction',
				position: { x: 420, y: 200 },
				data: {
					functionName: 'game::teleportRelative',
					displayName: 'teleportRelative',
					namespace: 'game',
					params: ['state', 'entity', 'offset'],
					parameterModes: {
						offset: {
							current: 'vector',
							options: [
								{
									mode: 'vector',
									label: 'Vector',
									params: ['offset'],
								},
								{
									mode: 'literal-xy',
									label: 'Literal (dx, dy)',
									params: ['dx', 'dy'],
								},
							],
						},
					},
				},
			},
			{
				id: 'func-getPlayer',
				type: 'dynamicFunction',
				position: { x: 140, y: 120 },
				data: {
					functionName: 'game::getPlayer',
					displayName: 'getPlayer',
					namespace: 'game',
					params: ['state'],
				},
			},
			{ id: 'spell-input', type: 'spellInput', position: { x: -100, y: 150 }, data: { label: 'Game State', params: ['state'] } },
			{
				id: 'func-vector',
				type: 'vector',
				position: { x: 140, y: 240 },
				data: { x: 0, y: 0 },
			},
		],
		edges: [
			{ id: 'e1', source: 'func-teleport', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'spell-input', target: 'func-teleport', targetHandle: 'arg0' },
			{ id: 'e3', source: 'func-getPlayer', target: 'func-teleport', targetHandle: 'arg1' },
			{ id: 'e4', source: 'func-vector', target: 'func-teleport', targetHandle: 'arg2' },
			{ id: 'e5', source: 'spell-input', target: 'func-getPlayer', targetHandle: 'arg0' },
		],
	},
}

levelRegistry.register(Level1Meta)

export class Level1 extends BaseScene {
	private targets: Array<{
		id: string
		x: number
		y: number
		radius: number
		body: Phaser.Physics.Arcade.Image
		marker: Phaser.GameObjects.Arc
		active: boolean
	}> = []

	constructor() {
		super({ key: 'Level1' })
	}

	protected onLevelCreate(): void {
		// Tutorial hint
		this.showInstruction(
			'【Level 1: Code-Driven Movement】\n\n' +
			'Welcome to the Spell Compiler!\n' +
			'Here, you cannot move with WASD. You must write code to move.\n\n' +
			'• Press TAB to open the Spell Editor.\n' +
			'• You will see a "teleportRelative" function.\n' +
			'• Change the X and Y values to move your character.\n' +
			'• Connect the function to "Output" to make it work.\n\n' +
			'Goal: Teleport into the blue target circles one by one.'
		)

		// Define target locations
		// 1. Right: (+200, 0) relative to start (120, 270) -> (320, 270)
		// 2. Up: (0, -150) relative to target 1 -> (320, 120)
		// 3. Left-Down: (-150, +250) relative to target 2 -> (170, 370)
		
		this.createTarget('reach-target-1', 320, 270, 40)
		this.createTarget('reach-target-2', 320, 120, 40)
		this.createTarget('reach-target-3', 170, 370, 40)

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	private createTarget(id: string, x: number, y: number, radius: number) {
		// Create visual marker (hollow circle)
		const marker = this.add.circle(x, y, radius, 0x00ffff, 0.1)
		marker.setStrokeStyle(2, 0x00ffff)
		marker.setVisible(false) // Initially hidden
		
		// Create physics body for overlap detection
		// We use a transparent image with a circular body
		const body = createCircleBody(this, 'target-zone', 0x00ffff, radius, x, y, 0)
		body.setVisible(false)

		this.targets.push({
			id,
			x,
			y,
			radius,
			body,
			marker,
			active: true // All exist physically, but we only check the current objective
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		
		if (!playerBody) return

		// Force stop player movement (disable physics velocity)
		// Movement should only happen via teleport
		playerBody.setVelocity(0, 0)
		Velocity.x[playerEid] = 0
		Velocity.y[playerEid] = 0

		// Check current objective
		const currentObjective = this.allObjectives.find(obj => !obj.completed && obj.visible)
		if (!currentObjective) return

		const target = this.targets.find(t => t.id === currentObjective.id)
		if (!target) return

		// Highlight current target and ensure it is visible
		this.targets.forEach(t => {
			if (t.id === target.id) {
				t.marker.setVisible(true)
				t.marker.setStrokeStyle(4, 0x00ff00)
				t.marker.setFillStyle(0x00ff00, 0.2)
			} else {
				// Hide other targets
				t.marker.setVisible(false)
			}
		})

		// Check overlap
		const distance = Phaser.Math.Distance.Between(playerBody.x, playerBody.y, target.x, target.y)
		// Allow some margin error (player radius is approx 16)
		if (distance < target.radius) {
			this.completeObjectiveById(target.id)
			
			// Visual feedback
			this.tweens.add({
				targets: target.marker,
				scale: 1.5,
				alpha: 0,
				duration: 500,
				onComplete: () => {
					target.marker.destroy()
					target.body.destroy()
				}
			})

			// Show hint for next step
			if (target.id === 'reach-target-1') {
				this.showInstruction('Great! Now modify the code to move UP (negative Y).')
			} else if (target.id === 'reach-target-2') {
				this.showInstruction('Excellent! Now combine X and Y to move diagonally (Left and Down).')
			}
		}
	}
}
