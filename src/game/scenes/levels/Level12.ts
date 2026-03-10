import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level12Meta: LevelMeta = {
	key: 'Level12',
	playerSpawnX: 96,
	playerSpawnY: 288,
	tileSize: 64,
	mapData: [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	objectives: [
		{
			id: 'task1-left',
			description: 'Task 1: Stand on RED, deflect -35° to hit LEFT target',
			type: 'defeat',
		},
		{
			id: 'task2-right',
			description: 'Task 2: Stand on RED, deflect 35° to hit RIGHT target',
			type: 'defeat',
			prerequisite: 'task1-left',
		},
		{
			id: 'task3-split',
			description: 'Task 3: Split test - one code, hit BOTH targets',
			type: 'defeat',
			prerequisite: 'task2-right',
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
				id: 'func-conditional',
				type: 'dynamicFunction',
				position: { x: 300, y: 230 },
				data: {
					functionName: 'game::conditionalDeflectOnPlate',
					displayName: 'conditionalDeflectOnPlate',
					namespace: 'game',
					params: ['plateColor', 'trueAngle', 'falseAngle', 'delayMs'],
				},
			},
			{ id: 'lit-red', type: 'literal', position: { x: 50, y: 150 }, data: { value: 'RED' } },
			{ id: 'lit-angle-deflect', type: 'literal', position: { x: 50, y: 220 }, data: { value: -35 } },
			{ id: 'lit-angle-straight', type: 'literal', position: { x: 50, y: 290 }, data: { value: 0 } },
			{ id: 'lit-delay', type: 'literal', position: { x: 50, y: 360 }, data: { value: 500 } },
		],
		edges: [
			{ id: 'e1', source: 'func-conditional', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'lit-red', target: 'func-conditional', targetHandle: 'arg0' },
			{ id: 'e3', source: 'lit-angle-deflect', target: 'func-conditional', targetHandle: 'arg1' },
			{ id: 'e4', source: 'lit-angle-straight', target: 'func-conditional', targetHandle: 'arg2' },
			{ id: 'e5', source: 'lit-delay', target: 'func-conditional', targetHandle: 'arg3' },
		],
	},
}

levelRegistry.register(Level12Meta)

interface TargetInfo {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	destroyed: boolean
	taskId: string
}

export class Level12 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	// Energy shield - hollow (two halves, gap in middle)
	private shieldTop: Phaser.GameObjects.Rectangle | null = null
	private shieldBottom: Phaser.GameObjects.Rectangle | null = null
	private shieldTopBounds: Phaser.Geom.Rectangle | null = null
	private shieldBottomBounds: Phaser.Geom.Rectangle | null = null

	// Pressure plate state display
	private plateStatusText!: Phaser.GameObjects.Text

	// Task 3 count
	private task3TargetsDestroyed = 0

	constructor() {
		super({ key: 'Level12' })
	}

	// Reset level state (on level enter)
	private resetLevelState(): void {
		this.targets = []
		this.task2Unlocked = false
		this.task3Unlocked = false
		this.task3TargetsDestroyed = 0
		this.shieldTop = null
		this.shieldBottom = null
		this.shieldTopBounds = null
		this.shieldBottomBounds = null
	}

	protected onLevelCreate(): void {
		// Reset state when entering level
		this.resetLevelState()
		this.showInstruction(
			'【Level 12: Safe Split】\n\n' +
			'Use If node for conditional branching.\n\n' +
			'• getPlayerPlateColor(): get color of pressure plate under player\n' +
			'• If(condition, trueValue, falseValue)\n\n' +
			'Logic:\n' +
			'IF (on red plate) { deflect to bypass shield }\n' +
			'ELSE { go straight }\n\n' +
			'The shield blocks fireballs from the front!\n\n' +
			'Press TAB to edit spell, 1 to fire.'
		)

		// Lock player position
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// Create pressure plate state display
		this.plateStatusText = this.add.text(20, 80, 'Plate: NONE', {
			fontSize: '16px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Energy shield - hollow (two halves, gap for fireball); x=544
		const shieldX = 544
		const shieldWidth = 20
		const gapHeight = 80 // Center gap
		const shieldHeight = 80 // Each half

		// Upper half
		this.shieldTop = this.add.rectangle(shieldX, 288 - gapHeight / 2 - shieldHeight / 2, shieldWidth, shieldHeight, 0x00ffff, 0.7)
		this.shieldTop.setStrokeStyle(3, 0x00ffff)
		this.shieldTopBounds = this.shieldTop.getBounds()

		// Lower half
		this.shieldBottom = this.add.rectangle(shieldX, 288 + gapHeight / 2 + shieldHeight / 2, shieldWidth, shieldHeight, 0x00ffff, 0.7)
		this.shieldBottom.setStrokeStyle(3, 0x00ffff)
		this.shieldBottomBounds = this.shieldBottom.getBounds()

		// Shield label
		this.add.text(shieldX, 288 - gapHeight / 2 - shieldHeight - 15, '⚡ Shield', {
			fontSize: '12px',
			color: '#00ffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// Gap indicator
		this.add.text(shieldX, 288, '→', {
			fontSize: '16px',
			color: '#00ffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// Target positions: tileSize=64, map 15x9; shield at x=544, targets behind

		// Task 1: upper target (behind shield); fireball through gap, deflect -35° up
		this.createTarget(750, 128, 'Task 1: UP', 0xff4444, 'task1-left', true)

		// Task 2: lower target (behind shield), initially hidden; deflect +35° down
		this.createTarget(750, 448, 'Task 2: DOWN', 0x44ff44, 'task2-right', false)

		// Task 3: two targets at once, initially hidden; one deflect on plate, one straight off plate
		this.createTarget(820, 160, 'Task 3-A: Deflect', 0xffaa00, 'task3-deflect', false)
		this.createTarget(820, 360, 'Task 3-B: Straight', 0xffaa00, 'task3-straight', false)

		// Bind key '1' to fire and cast
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// Lock player to left area (can step on plates or not)
		if (playerBody) {
			const minX = 64
			const maxX = 280 // In front of shield
			const minY = 96
			const maxY = 480
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// Update pressure plate state display
		const plateColor = this.world.resources.currentPlateColor
		this.plateStatusText.setText(`Plate: ${plateColor}`)
		if (plateColor === 'RED') {
			this.plateStatusText.setColor('#ff6666')
		} else {
			this.plateStatusText.setColor('#ffffff')
		}

		// Check fireball vs shield collision
		this.checkShieldCollision()

		// Detect target destroyed
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				target.body.destroy()

				// Complete corresponding task
				if (target.taskId === 'task1-left') {
					this.completeObjectiveById('task1-left')
					this.unlockTask2()
					this.cameras.main.flash(200, 255, 0, 0)
				} else if (target.taskId === 'task2-right') {
					this.completeObjectiveById('task2-right')
					this.unlockTask3()
					this.cameras.main.flash(200, 0, 255, 0)
				} else if (target.taskId === 'task3-deflect' || target.taskId === 'task3-straight') {
					this.task3TargetsDestroyed++
					this.cameras.main.flash(200, 255, 165, 0)

					// Task 3 complete when both targets destroyed
					if (this.task3TargetsDestroyed >= 2) {
						this.completeObjectiveById('task3-split')
					}
				}
			}
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-right')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)
			task2Target.body.setVisible(true)

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

		// Task 3: no shield change; hollow design allows straight pass

		// Show Task 3 targets
		const task3Targets = this.targets.filter(t => t.taskId.startsWith('task3-'))
		console.log('[Level12] unlockTask3: showing targets ->', task3Targets.map(t => t.taskId))
		task3Targets.forEach(target => {
			target.marker.setVisible(true)
			target.label.setVisible(true)
			target.body.setVisible(true)

			this.tweens.add({
				targets: [target.marker, target.label, target.body],
				alpha: { from: 0, to: 1 },
				scale: { from: 0.5, to: 1 },
				duration: 500,
				ease: 'Back.easeOut'
			})
		})

		// Task 3 rule hint
		this.add.text(480, 50, '⚠️ Task 3: Hit both targets with one spell!\nFirst shot: on plate deflect; second: off plate straight', {
			fontSize: '12px',
			color: '#ffaa00',
			stroke: '#000000',
			strokeThickness: 2,
			align: 'center',
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000)
	}

	private checkShieldCollision() {
		// Check upper shield
		if (this.shieldTop && this.shieldTopBounds) {
			this.shieldTopBounds = this.shieldTop.getBounds()
			this.checkCollisionWithShieldPart(this.shieldTopBounds)
		}

		// Check lower shield
		if (this.shieldBottom && this.shieldBottomBounds) {
			this.shieldBottomBounds = this.shieldBottom.getBounds()
			this.checkCollisionWithShieldPart(this.shieldBottomBounds)
		}
	}

	private checkCollisionWithShieldPart(bounds: Phaser.Geom.Rectangle) {
		// Check all fireballs
		this.world.resources.bodies.forEach((body, eid) => {
			// Is it a fireball?
			if (FireballStats.speed[eid] === undefined) return

			if (
				body.x > bounds.left &&
				body.x < bounds.right &&
				body.y > bounds.top &&
				body.y < bounds.bottom
			) {
				// Fireball blocked by shield
				body.destroy()
				this.world.resources.bodies.delete(eid)

				// Show block effect
				const flash = this.add.circle(body.x, body.y, 20, 0x00ffff, 0.8)
				this.tweens.add({
					targets: flash,
					alpha: 0,
					scale: 2,
					duration: 300,
					onComplete: () => flash.destroy()
				})
			}
		})
	}

	private shootAndCastSpell() {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		// 1. Fire fireball (fixed right)
		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 2. Hint binding
        console.log('[Level12] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
	}

	private spawnFireball(x: number, y: number, dirX: number, dirY: number) {
		const key = 'fireball'
		if (!this.textures.exists(key)) {
			const g = this.add.graphics()
			g.fillStyle(0xffaa33, 1)
			g.fillCircle(6, 6, 6)
			g.generateTexture(key, 12, 12)
			g.destroy()
		}

		const body = this.physics.add.image(x, y, key)
		body.setDepth(20)

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

		FireballStats.speed[eid] = 220
		FireballStats.damage[eid] = 50
		FireballStats.hitRadius[eid] = 20
		FireballStats.initialX[eid] = x
		FireballStats.initialY[eid] = y
		FireballStats.pendingDeflection[eid] = 0
		FireballStats.deflectAtTime[eid] = 0
		FireballStats.deflectOnPlateColor[eid] = 0
		FireballStats.deflectOnPlateAngle[eid] = 0
		FireballStats.plateDeflected[eid] = 0

		Lifetime.bornAt[eid] = Date.now()
		Lifetime.lifetimeMs[eid] = 5000

		Velocity.x[eid] = dirX * FireballStats.speed[eid]
		Velocity.y[eid] = dirY * FireballStats.speed[eid]

		return eid
	}

	private createTarget(x: number, y: number, labelText: string, color: number, taskId: string, visible: boolean) {
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
		body.setVisible(visible)

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
