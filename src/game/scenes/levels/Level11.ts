import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level11Meta: LevelMeta = {
	key: 'Level11',
	playerSpawnX: 96,
	playerSpawnY: 288,
	tileSize: 64,
	mapData: [
		// 15 cols x 9 rows = 960x576; layout: player | wall1+gap | zone1 | wall2 | zone2 | wall3 | zone3
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // Upper gap
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // Wall1 gap
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // Player row
		[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // Wall2 gap
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // Lower gap
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	objectives: [
		{
			id: 'task1-corridor',
			description: 'Task 1: Deflect 30° up through corridor (delay=400ms)',
			type: 'defeat',
		},
		{
			id: 'task2-deep',
			description: 'Task 2: Deflect -30° down to deep target (delay=800ms)',
			type: 'defeat',
			prerequisite: 'task1-corridor',
		},
		{
			id: 'task3-cover',
			description: 'Task 3: Deflect 15° to hit shielded target (delay=600ms)',
			type: 'defeat',
			prerequisite: 'task2-deep',
		},
	],
	initialSpellWorkflow: {
		nodes: [
			{
				id: 'output-1',
				type: 'output',
				position: { x: 600, y: 250 },
				data: { label: 'Output' },
			},
			{
				id: 'func-deflect',
				type: 'dynamicFunction',
				position: { x: 340, y: 230 },
				data: {
					functionName: 'game::deflectAfterTime',
					displayName: 'deflectAfterTime',
					namespace: 'game',
					params: ['angle', 'delayMs'],
				},
			},
			{ id: 'lit-angle', type: 'literal', position: { x: 100, y: 200 }, data: { value: 30 } },
			{ id: 'lit-delay', type: 'literal', position: { x: 100, y: 280 }, data: { value: 400 } },
		],
		edges: [
			{ id: 'e1', source: 'func-deflect', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'lit-angle', target: 'func-deflect', targetHandle: 'arg0' },
			{ id: 'e3', source: 'lit-delay', target: 'func-deflect', targetHandle: 'arg1' },
		],
	},
}

levelRegistry.register(Level11Meta)

interface TargetInfo {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	destroyed: boolean
	taskId: string
}

export class Level11 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	constructor() {
		super({ key: 'Level11' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 11: Deflection Intro】\n\n' +
			'Use deflectAfterTime(angle, delayMs) to deflect the fireball.\n\n' +
			'• angle: deflection angle (positive = up, negative = down)\n' +
			'• delayMs: delay in milliseconds\n\n' +
			'Fireball speed = 250 px/s\n' +
			'Fireball disappears on wall hit!\n\n' +
			'Press TAB to edit spell.\n' +
			'Press 1 to fire and cast.'
		)

		// Lock player to left area
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// Target positions from layout: 15x9, tileSize=64
		// Player at x=96; wall1 at x=256 (row3 gap), wall2 at x=512 (row5 gap), wall3 at x=768 (row3 gap)

		// Task 1: target past first wall via upper gap (row=3, x~384)
		// Fireball: 30° up, delay 400ms
		this.createTarget(384, 160, 'Task 1: 30°, 400ms', 0x00ff00, 'task1-corridor', true)

		// Task 2: target past second wall via lower gap (row=5, x~640); -30° down, delay 800ms
		this.createTarget(640, 416, 'Task 2: -30°, 800ms', 0xffaa00, 'task2-deep', false)

		// Task 3: farthest target; 15° up, delay 600ms; past third wall
		this.createTarget(864, 224, 'Task 3: 15°, 600ms', 0xff00ff, 'task3-cover', false)

		// Bind key '1' to fire and cast
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// Lock player to left area
		if (playerBody) {
			const minX = 64
			const maxX = 192 // In front of first wall
			const minY = 96
			const maxY = 480
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// Detect target destroyed
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				target.body.destroy()

				// Complete task and unlock next
				if (target.taskId === 'task1-corridor') {
					this.completeObjectiveById('task1-corridor')
					this.unlockTask2()
					this.cameras.main.flash(200, 0, 255, 0)
				} else if (target.taskId === 'task2-deep') {
					this.completeObjectiveById('task2-deep')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 165, 0)
				} else if (target.taskId === 'task3-cover') {
					this.completeObjectiveById('task3-cover')
					this.cameras.main.flash(200, 255, 0, 255)
				}
			}
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		// Show Task 2 target (including body)
		const task2Target = this.targets.find(t => t.taskId === 'task2-deep')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)
			task2Target.body.setVisible(true)

			// Spawn animation
			this.tweens.add({
				targets: [task2Target.marker, task2Target.label, task2Target.body],
				alpha: { from: 0, to: 1 },
				scale: { from: 0.5, to: 1 },
				duration: 500,
				ease: 'Back.easeOut'
			})
		}
	}

	private unlockTask3() {
		if (this.task3Unlocked) return
		this.task3Unlocked = true

		// Show Task 3 target (including body)
		const task3Target = this.targets.find(t => t.taskId === 'task3-cover')
		if (task3Target) {
			task3Target.marker.setVisible(true)
			task3Target.label.setVisible(true)
			task3Target.body.setVisible(true)

			// Spawn animation
			this.tweens.add({
				targets: [task3Target.marker, task3Target.label, task3Target.body],
				alpha: { from: 0, to: 1 },
				scale: { from: 0.5, to: 1 },
				duration: 500,
				ease: 'Back.easeOut'
			})
		}
	}

	private shootAndCastSpell() {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		// 1. Fire fireball (fixed right)
		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 2. Hint binding
        console.log('[Level11] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
	}

	private spawnFireball(x: number, y: number, dirX: number, dirY: number) {
		// Ensure fireball texture exists
		const key = 'fireball'
		if (!this.textures.exists(key)) {
			const g = this.add.graphics()
			g.fillStyle(0xffaa33, 1)
			g.fillCircle(6, 6, 6)
			g.generateTexture(key, 12, 12)
			g.destroy()
		}

		// Create physics body
		const body = this.physics.add.image(x, y, key)
		body.setDepth(20)

		// Create ECS entity
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Fireball)
		addComponent(this.world, eid, Velocity)
		addComponent(this.world, eid, Owner)
		addComponent(this.world, eid, Direction)
		addComponent(this.world, eid, FireballStats)
		addComponent(this.world, eid, Lifetime)

		const playerEid = this.world.resources.playerEid
		Owner.eid[eid] = playerEid

		Direction.x[eid] = dirX
		Direction.y[eid] = dirY

		FireballStats.speed[eid] = 250
		FireballStats.damage[eid] = 50
		FireballStats.hitRadius[eid] = 20
		FireballStats.initialX[eid] = x
		FireballStats.initialY[eid] = y
		FireballStats.pendingDeflection[eid] = 0
		FireballStats.deflectAtTime[eid] = 0
		// Plate-based deflection (initialized to 0)
		FireballStats.deflectOnPlateColor[eid] = 0
		FireballStats.deflectOnPlateAngle[eid] = 0
		FireballStats.plateDeflected[eid] = 0

		// Extend lifetime (5s) to traverse terrain
		Lifetime.bornAt[eid] = Date.now()
		Lifetime.lifetimeMs[eid] = 5000

		Velocity.x[eid] = dirX * FireballStats.speed[eid]
		Velocity.y[eid] = dirY * FireballStats.speed[eid]

		return eid
	}

	private createTarget(x: number, y: number, labelText: string, color: number, taskId: string, visible: boolean) {
		// Create visual marker
		const marker = this.add.circle(x, y, 25, color, 0.6).setStrokeStyle(3, color)
		marker.setVisible(visible)

		const label = this.add.text(x, y - 45, labelText, {
			fontSize: '14px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 3,
			backgroundColor: '#333333aa',
			padding: { x: 6, y: 3 },
		}).setOrigin(0.5)
		label.setVisible(visible)

		// Create enemy entity (body visibility follows visible)
		const body = createRectBody(this, `target-${taskId}`, color, 50, 50, x, y, 3)
		body.setImmovable(true)
		body.setVisible(visible) // Hidden task body stays hidden

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = 10
		Health.current[eid] = 10

		this.targets.push({ eid, body, marker, label, destroyed: false, taskId })
	}
}
