import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite } from '../../components'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'

export const Level4Meta: LevelMeta = {
	key: 'Level4',
	playerSpawnX: 480,
	playerSpawnY: 480, // Spawn outside battle zone (below it)
	tileSize: 80,
	mapData: createRoom(12, 8),
	editorRestrictions: /^(game::teleportRelative|game::getPlayer|game::getEntityPosition|game::emitEvent|vec::create)$/,
	allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction'],
	objectives: [
		{
			id: 'survive-10-seconds',
			description: 'Survive for 10 seconds',
			type: 'spell',
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

levelRegistry.register(Level4Meta)

export class Level4 extends BaseScene {
	private bullets: Array<{
		eid: number
		body: Phaser.Physics.Arcade.Image
		direction: { x: number; y: number }
		lastHitTime: number
	}> = []

	private startTime = 0
	private survivalTime = 0
	private readonly SURVIVAL_GOAL = 10 // 10 seconds
	private readonly BULLET_SPEED = 1200
	private readonly BULLET_SPAWN_INTERVAL_START = 1200 // Starting spawn interval (ms)
	private readonly BULLET_SPAWN_INTERVAL_END = 200 // Ending spawn interval (ms)
	private readonly BULLET_DAMAGE = 25 // Damage per hit
	private readonly HIT_COOLDOWN = 500 // Cooldown between hits from same bullet (ms)

	private spawnTimer = 0
	private timerText!: Phaser.GameObjects.Text
	private battleStarted = false
	private battleZone!: Phaser.GameObjects.Rectangle
	private battleZoneBounds!: { x: number; y: number; width: number; height: number }

	constructor() {
		super({ key: 'Level4' })
	}

	protected onLevelCreate(): void {
		// Reset level state on restart
		this.bullets = []
		this.startTime = 0
		this.survivalTime = 0
		this.spawnTimer = 0
		this.battleStarted = false

		// Tutorial hint
		this.showInstruction(
			'【Level 4: Custom Event】\n\n' +
			'Enter the central battle zone to begin!\n\n' +
			'Fast bullets will attack you.\n' +
			'Goal: Survive for 10 seconds.\n\n' +
			'• Press TAB to open Event Bindings panel\n' +
			'• Create an "onBulletNear" event handler\n' +
			'• Use game::emitEvent to manually trigger it!\n' +
			'• Calculate bullet distance yourself and emit when close\n\n' +
			'Tip: Unlike Level 3, bullets won\'t automatically\n' +
			'trigger events - YOU control when events fire!'
		)

		// Create central battle zone (surrounded by walls)
		this.createBattleZone()

		// Create timer display (initially hidden)
		this.timerText = this.add
			.text(480, 40, 'Time: 0.0s / 10.0s', {
				fontSize: '24px',
				color: '#ffffff',
				fontStyle: 'bold',
				backgroundColor: '#000000',
				padding: { x: 10, y: 5 },
			})
			.setOrigin(0.5)
			.setScrollFactor(0)
			.setDepth(1500)
			.setVisible(false)

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	private createBattleZone() {
		const roomWidth = 12 * 80
		const roomHeight = 8 * 80
		const centerX = roomWidth / 2
		const centerY = roomHeight / 2
		
		// Battle zone dimensions (smaller than room)
		const zoneWidth = 400
		const zoneHeight = 300
		
		this.battleZoneBounds = {
			x: centerX - zoneWidth / 2,
			y: centerY - zoneHeight / 2,
			width: zoneWidth,
			height: zoneHeight,
		}

		// Visual indicator for battle zone (semi-transparent)
		this.battleZone = this.add.rectangle(
			centerX,
			centerY,
			zoneWidth,
			zoneHeight,
			0xff0000,
			0.1
		)
		this.battleZone.setStrokeStyle(3, 0xff0000, 0.8)

		// Add pulsing animation to make it obvious
		this.tweens.add({
			targets: this.battleZone,
			alpha: 0.3,
			duration: 1000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut',
		})

		// Create walls around the battle zone with an entrance at the bottom
		const wallThickness = 20
		const wallColor = 0x666666
		const entranceWidth = 80 // Width of the entrance gap

		// Top wall (full)
		const topWall = this.add.rectangle(
			centerX,
			this.battleZoneBounds.y - wallThickness / 2,
			zoneWidth + wallThickness * 2,
			wallThickness,
			wallColor
		)
		this.physics.add.existing(topWall, true)
		this.platforms.add(topWall)
		this.world.resources.walls.push(topWall)

		// Bottom wall - split into two parts with entrance in the middle
		const bottomY = this.battleZoneBounds.y + zoneHeight + wallThickness / 2
		const bottomWallWidth = (zoneWidth - entranceWidth) / 2

		// Bottom-left wall segment
		const bottomLeftWall = this.add.rectangle(
			centerX - zoneWidth / 2 + bottomWallWidth / 2,
			bottomY,
			bottomWallWidth,
			wallThickness,
			wallColor
		)
		this.physics.add.existing(bottomLeftWall, true)
		this.platforms.add(bottomLeftWall)
		this.world.resources.walls.push(bottomLeftWall)

		// Bottom-right wall segment
		const bottomRightWall = this.add.rectangle(
			centerX + zoneWidth / 2 - bottomWallWidth / 2,
			bottomY,
			bottomWallWidth,
			wallThickness,
			wallColor
		)
		this.physics.add.existing(bottomRightWall, true)
		this.platforms.add(bottomRightWall)
		this.world.resources.walls.push(bottomRightWall)

		// Left wall (full)
		const leftWall = this.add.rectangle(
			this.battleZoneBounds.x - wallThickness / 2,
			centerY,
			wallThickness,
			zoneHeight,
			wallColor
		)
		this.physics.add.existing(leftWall, true)
		this.platforms.add(leftWall)
		this.world.resources.walls.push(leftWall)

		// Right wall (full)
		const rightWall = this.add.rectangle(
			this.battleZoneBounds.x + zoneWidth + wallThickness / 2,
			centerY,
			wallThickness,
			zoneHeight,
			wallColor
		)
		this.physics.add.existing(rightWall, true)
		this.platforms.add(rightWall)
		this.world.resources.walls.push(rightWall)

		// Add entrance indicator arrows
		const arrowY = bottomY + 40
		this.add.text(centerX, arrowY, '▲ ENTER ▲', {
			fontSize: '24px',
			color: '#00ff00',
			fontStyle: 'bold',
			stroke: '#000000',
			strokeThickness: 4,
		}).setOrigin(0.5).setDepth(100)

		// Add battle zone text
		this.add.text(centerX, centerY, 'BATTLE ZONE', {
			fontSize: '32px',
			color: '#ff0000',
			fontStyle: 'bold',
			stroke: '#000000',
			strokeThickness: 4,
		}).setOrigin(0.5).setDepth(100)
	}

	private spawnBullet() {
		if (!this.battleStarted) return

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		// Spawn bullets from edges of the battle zone (not room edges)
		const edge = Phaser.Math.Between(0, 3) // 0=top, 1=right, 2=bottom, 3=left
		let spawnX = 0
		let spawnY = 0

		const margin = 10

		switch (edge) {
			case 0: // top
				spawnX = Phaser.Math.Between(
					this.battleZoneBounds.x + margin,
					this.battleZoneBounds.x + this.battleZoneBounds.width - margin
				)
				spawnY = this.battleZoneBounds.y + margin
				break
			case 1: // right
				spawnX = this.battleZoneBounds.x + this.battleZoneBounds.width - margin
				spawnY = Phaser.Math.Between(
					this.battleZoneBounds.y + margin,
					this.battleZoneBounds.y + this.battleZoneBounds.height - margin
				)
				break
			case 2: // bottom
				spawnX = Phaser.Math.Between(
					this.battleZoneBounds.x + margin,
					this.battleZoneBounds.x + this.battleZoneBounds.width - margin
				)
				spawnY = this.battleZoneBounds.y + this.battleZoneBounds.height - margin
				break
			case 3: // left
				spawnX = this.battleZoneBounds.x + margin
				spawnY = Phaser.Math.Between(
					this.battleZoneBounds.y + margin,
					this.battleZoneBounds.y + this.battleZoneBounds.height - margin
				)
				break
		}

		// Create bullet entity
		const eid = spawnEntity(this.world)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Velocity)

		// Create visual body (red square) - larger size
		const bulletSize = 24 // Increased from 16 to 24
		const body = this.physics.add.image(spawnX, spawnY, '')
		body.setDisplaySize(bulletSize, bulletSize)
		body.setTint(0xff0000)

		// Create red square texture if not exists
		if (!this.textures.exists('bullet-red')) {
			const graphics = this.add.graphics()
			graphics.fillStyle(0xff0000, 1)
			graphics.fillRect(-bulletSize / 2, -bulletSize / 2, bulletSize, bulletSize)
			graphics.generateTexture('bullet-red', bulletSize, bulletSize)
			graphics.destroy()
		}

		body.setTexture('bullet-red')
		body.setDepth(15)

		this.world.resources.bodies.set(eid, body)

		// Calculate direction towards player
		const dx = playerBody.x - spawnX
		const dy = playerBody.y - spawnY
		const distance = Math.sqrt(dx * dx + dy * dy)

		const direction = {
			x: distance > 0 ? dx / distance : 0,
			y: distance > 0 ? dy / distance : 0,
		}

		// Set velocity
		Velocity.x[eid] = direction.x * this.BULLET_SPEED
		Velocity.y[eid] = direction.y * this.BULLET_SPEED

		this.bullets.push({ eid, body, direction, lastHitTime: 0 })
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		if (!playerBody) return

		// Disable default movement
		playerBody.setVelocity(0, 0)
		Velocity.x[playerEid] = 0
		Velocity.y[playerEid] = 0

		// Check if player entered battle zone
		if (!this.battleStarted) {
			const inZone =
				playerBody.x > this.battleZoneBounds.x &&
				playerBody.x < this.battleZoneBounds.x + this.battleZoneBounds.width &&
				playerBody.y > this.battleZoneBounds.y &&
				playerBody.y < this.battleZoneBounds.y + this.battleZoneBounds.height

			if (inZone) {
				this.battleStarted = true
				this.startTime = Date.now()
				this.timerText.setVisible(true)
				this.showInstruction('Battle started! Survive 10 seconds!')
			} else {
				// Player hasn't entered yet, no need to process further
				return
			}
		}

		// Update survival timer
		this.survivalTime = (Date.now() - this.startTime) / 1000
		this.timerText.setText(`Time: ${this.survivalTime.toFixed(1)}s / ${this.SURVIVAL_GOAL}.0s`)

		// Check if survived
		if (this.survivalTime >= this.SURVIVAL_GOAL) {
			this.completeObjectiveById('survive-10-seconds')
			this.timerText.setColor('#00ff00')
			return
		}

		// Calculate current spawn interval based on time (decreases from 1200ms to 200ms over 10 seconds)
		const progress = Math.min(this.survivalTime / this.SURVIVAL_GOAL, 1) // 0 to 1
		const currentSpawnInterval = 
			this.BULLET_SPAWN_INTERVAL_START - 
			(this.BULLET_SPAWN_INTERVAL_START - this.BULLET_SPAWN_INTERVAL_END) * progress

		// Spawn bullets periodically (only after battle started)
		this.spawnTimer += this.game.loop.delta
		if (this.spawnTimer >= currentSpawnInterval) {
			this.spawnTimer = 0
			this.spawnBullet()
		}

		// Update bullets and check collisions
		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const bullet = this.bullets[i]

			// Check distance to player
			const distance = Phaser.Math.Distance.Between(
				bullet.body.x,
				bullet.body.y,
				playerBody.x,
				playerBody.y
			)

			// NOTE: In Level 4, we DON'T automatically emit onBulletNear
			// Players must manually check bullet positions and emit events themselves
			// This teaches them how to use game::emitEvent

			// Check collision (within 28 pixels = hit) - adjusted for larger bullet size (24px)
			if (distance < 28) {
				const currentTime = Date.now()
				// Only damage if enough time has passed since last hit from this bullet
				if (currentTime - bullet.lastHitTime > this.HIT_COOLDOWN) {
					// Damage player
					Health.current[playerEid] = Math.max(0, Health.current[playerEid] - this.BULLET_DAMAGE)
					bullet.lastHitTime = currentTime

					// Check if player died
					if (Health.current[playerEid] <= 0) {
						this.showInstruction('You died! Restarting...')
						this.time.delayedCall(1500, () => {
							this.scene.restart()
						})
						return
					}
				}
			}

			// Remove bullets that go out of battle zone bounds (with margin)
			const margin = 50
			if (
				bullet.body.x < this.battleZoneBounds.x - margin ||
				bullet.body.x > this.battleZoneBounds.x + this.battleZoneBounds.width + margin ||
				bullet.body.y < this.battleZoneBounds.y - margin ||
				bullet.body.y > this.battleZoneBounds.y + this.battleZoneBounds.height + margin
			) {
				bullet.body.destroy()
				this.world.resources.bodies.delete(bullet.eid)
				this.bullets.splice(i, 1)
			}
		}
	}
}
