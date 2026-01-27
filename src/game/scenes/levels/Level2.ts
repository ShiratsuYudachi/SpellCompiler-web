import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy } from '../../components'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { LaserWall } from '../../prefabs/LaserWall'

export const Level2Meta: LevelMeta = {
	key: 'Level2',
	playerSpawnX: 120,
	playerSpawnY: 270,
	editorRestrictions: /^(game::spawnFireball|game::getPlayer|game::getEntityPosition|vec::create|vec::normalize|vec::subtract)$/,
	allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction'],
	objectives: [
		{
			id: 'kill-enemy-right',
			description: 'Kill the enemy on your right (+X direction)',
			type: 'defeat',
		},
		{
			id: 'kill-enemy-diagonal',
			description: 'Kill the enemy diagonally',
			type: 'defeat',
			prerequisite: 'kill-enemy-right',
		},
		{
			id: 'kill-enemy-behind-wall',
			description: 'Kill the enemy behind the wall',
			type: 'defeat',
			prerequisite: 'kill-enemy-diagonal',
		},
	],

	initialSpellWorkflow: {
		nodes: [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 1000, y: 300 },
				data: { label: 'Output' },
			},
			{
				id: 'func-spawnFireball',
				type: 'dynamicFunction',
				position: { x: 700, y: 280 },
				data: {
					functionName: 'game::spawnFireball',
					displayName: 'spawnFireball',
					namespace: 'game',
					params: ['state', 'position', 'direction'],
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
			{
				id: 'func-getEntityPosition',
				type: 'dynamicFunction',
				position: { x: 400, y: 200 },
				data: {
					functionName: 'game::getEntityPosition',
					displayName: 'getEntityPosition',
					namespace: 'game',
					params: ['state', 'entity'],
				},
			},
			{
				id: 'spell-input',
				type: 'spellInput',
				position: { x: -100, y: 150 },
				data: { label: 'Game State', params: ['state'] },
			},
			{
				id: 'func-vector-direction',
				type: 'vector',
				position: { x: 400, y: 360 },
				data: { x: 1, y: 0 },
			},
		],
		edges: [
			{ id: 'e1', source: 'func-spawnFireball', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'spell-input', target: 'func-spawnFireball', targetHandle: 'arg0' },
			{ id: 'e3', source: 'func-getEntityPosition', target: 'func-spawnFireball', targetHandle: 'arg1' },
			{ id: 'e4', source: 'func-vector-direction', target: 'func-spawnFireball', targetHandle: 'arg2' },
			{ id: 'e5', source: 'spell-input', target: 'func-getPlayer', targetHandle: 'arg0' },
			{ id: 'e6', source: 'func-getPlayer', target: 'func-getEntityPosition', targetHandle: 'arg1' },
			{ id: 'e7', source: 'spell-input', target: 'func-getEntityPosition', targetHandle: 'arg0' },
		],
	},
}

levelRegistry.register(Level2Meta)

export class Level2 extends BaseScene {
	private enemies: Array<{
		id: string
		eid: number | null
		x: number
		y: number
		body: Phaser.Physics.Arcade.Image | null
		spawned: boolean
		killed: boolean
	}> = []

	private laserWall!: LaserWall

	constructor() {
		super({ key: 'Level2' })
	}

	protected onLevelCreate(): void {
		// Tutorial hint
		this.showInstruction(
			'【Level 2: Attack】\n\n' +
			'Now you will learn to attack!\n\n' +
			'• Press TAB to open the Spell Editor.\n' +
			'• Use "spawnFireball" to shoot fireballs.\n' +
			'• Change the direction vector to aim at enemies.\n' +
			'• Press "1" key to cast your spell.\n\n' +
			'Goal: Kill all three enemies one by one.\n' +
			'Warning: Avoid the red laser wall - it is deadly!'
		)

		// Create deadly laser wall between player and enemies (close to player)
		this.laserWall = new LaserWall(this, 300, 270, 10, 540)

		// Register enemy positions (all on the other side of laser)
		this.enemies = [
			{ id: 'kill-enemy-right', eid: null, x: 450, y: 270, body: null, spawned: false, killed: false },
			{ id: 'kill-enemy-diagonal', eid: null, x: 500, y: 150, body: null, spawned: false, killed: false },
			{ id: 'kill-enemy-behind-wall', eid: null, x: 750, y: 270, body: null, spawned: false, killed: false },
		]

		// Spawn only the first enemy
		this.spawnNextEnemy()

		// Create wall (with some distance from laser)
		this.createWallObstacle(600, 270, 30, 200)

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	private spawnNextEnemy() {
		// Find the first enemy that hasn't been spawned AND hasn't been killed
		const nextEnemy = this.enemies.find(e => !e.spawned && !e.killed)
		if (!nextEnemy) return

		// Create enemy entity
		const eid = spawnEntity(this.world)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		addComponent(this.world, eid, Sprite)

		Health.max[eid] = 30
		Health.current[eid] = 30

		// Create red square instead of image
		const body = this.physics.add.image(nextEnemy.x, nextEnemy.y, '')
		body.setDisplaySize(32, 32)
		body.setTint(0xff0000)
		
		// Draw red square (only generate texture once)
		if (!this.textures.exists('red-square-enemy')) {
			const graphics = this.add.graphics()
			graphics.fillStyle(0xff0000, 1)
			graphics.fillRect(-16, -16, 32, 32)
			graphics.generateTexture('red-square-enemy', 32, 32)
			graphics.destroy()
		}
		
		body.setTexture('red-square-enemy')
		
		this.world.resources.bodies.set(eid, body)

		// Update enemy info
		nextEnemy.eid = eid
		nextEnemy.body = body
		nextEnemy.spawned = true
	}


	private createWallObstacle(x: number, y: number, width: number, height: number) {
		const wall = this.add.rectangle(x, y, width, height, 0x3e4a59, 1)
		this.physics.add.existing(wall, true)
		this.platforms.add(wall)
		this.world.resources.walls.push(wall)
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		if (!playerBody) return

		// Force stop player movement (code-based movement only)
		playerBody.setVelocity(0, 0)
		Velocity.x[playerEid] = 0
		Velocity.y[playerEid] = 0

		// Check if player touches laser wall - instant death
		if (this.laserWall.contains(playerBody.x, playerBody.y)) {
			// Player died - restart level
			Health.current[playerEid] = 0
			this.showInstruction('You touched the laser! Restarting...')
			this.time.delayedCall(1500, () => {
				this.scene.restart()
			})
			return
		}

		// Check enemy deaths and complete objectives
		for (const enemy of this.enemies) {
			if (enemy.spawned && !enemy.killed && enemy.eid !== null && enemy.body !== null && Health.current[enemy.eid] <= 0) {
				// Enemy is dead
				enemy.body.destroy()
				enemy.killed = true
				enemy.body = null

				// Complete the corresponding objective
				this.completeObjectiveById(enemy.id)

				// Show hints and spawn next enemy
				if (enemy.id === 'kill-enemy-right') {
					this.showInstruction(
						'Good! Now aim diagonally.\n' +
						'Hint: Try direction vector like (1, -1) for diagonal shooting.'
					)
					this.spawnNextEnemy()
				} else if (enemy.id === 'kill-enemy-diagonal') {
					this.showInstruction(
						'Excellent! Now for the tricky one...\n' +
						'The enemy is behind the wall, and there is a deadly laser.\n' +
						'You cannot walk through the laser.\n\n' +
						'Hint: Maybe you can shoot through the wall?\n' +
						'Or teleport far enough to get around?'
					)
					this.spawnNextEnemy()
				}
				
				break // Only handle one death per frame
			}
		}
	}
}
