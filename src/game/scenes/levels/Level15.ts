import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level15Meta: LevelMeta = {
	key: 'Level15',
	playerSpawnX: 96,
	playerSpawnY: 96,
	tileSize: 64,
	mapData: [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 5, 1, 6, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
		[1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
		[1, 1, 6, 0, 0, 0, 0, 0, 5, 0, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	objectives: [
		{
			id: 'T1',
			description: 'Task 1: Angled Rebound — Use the first RED plate to perform an angled rebound and land on the yellow plate in the diagonal corridor.',
			type: 'defeat',
		},
		{
			id: 'T2',
			description: 'Task 2: Vertical Ascent — Use the second RED plate to flatten then immediately ascend through the narrow vertical channel.',
			type: 'defeat',
			prerequisite: 'T1',
		},
		{
			id: 'T3',
			description: 'Task 3: Final Strike — Use the final YELLOW plate to complete the turn and destroy the target at the end of the corridor.',
			type: 'defeat',
			prerequisite: 'T2',
		},
	],
	hints: [
		"Core challenge: you will pass RED and YELLOW plates twice; you must distinguish the trigger order.",
		"Programming tip: use a variable `stage = 1`. After each plate hit, increment `stage`.",
		"Logic example: if (color === 'RED' && stage === 1) { ... } else if (color === 'RED' && stage === 3) { ... }",
	],
}

levelRegistry.register(Level15Meta)

interface TargetInfo {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	destroyed: boolean
	taskId: string
}

export class Level15 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false


	constructor() {
		super({ key: 'Level15' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'[Level 15: Multi-Stage Guidance Challenge]\n\n' +
			'Practice building Else-If chains to react to different pressure plates during a single fireball flight.\n\n' +
			'• First RED plate near grid (4,2)\n' +
			'• YELLOW plate near grid (8,7)\n' +
			'• Use getFireballPlateColor() inside an onFireballFlying trigger to decide actions.\n+\n' +
			'Tips:\n' +
			"- Distinguish plate hits by tracking a `stage` variable across multiple plate encounters.\n" +
			"- Example: if (color === 'RED' && stage === 1) { deflect(-45) } else if (color === 'YELLOW' && stage === 2) { deflect(0) }\n\n" +
			'Press TAB to edit spells, press 1 to fire a ball and run your spell.'
		)

		// 锁定玩家位置（起点坐标：96,96）
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 96)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 按你提供的配置创建目标（使用格子中心计算）
		// T1: 黄板1附近 (grid 2,5) -> (2*64+32, 5*64+32) = (160, 352)
		// T2: 黄板2附近 (grid 8,1) -> (8*64+32, 1*64+32) = (544, 96)
		// T3: 终点区域 (grid 13,1) -> (13*64+32, 1*64+32) = (864, 96)

		// Phase 1: Angled Rebound (visible)
		this.createTarget(160, 352, 'Phase 1: Angled Rebound', 0xffcc00, 'T1', true)

		// Phase 2: Vertical Ascent (initially hidden)
		this.createTarget(544, 96, 'Phase 2: Vertical Ascent', 0xff6666, 'T2', false)

		// Phase 3: Final Strike (initially hidden)
		this.createTarget(864, 96, 'Phase 3: Final Strike', 0xffff66, 'T3', false)

		// 绑定按键
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// WASD移动
		if (playerBody) {
			const speed = 220
			playerBody.setVelocity(0)
			if (this.input.keyboard!.addKey('A').isDown) playerBody.setVelocityX(-speed)
			if (this.input.keyboard!.addKey('D').isDown) playerBody.setVelocityX(speed)
			if (this.input.keyboard!.addKey('W').isDown) playerBody.setVelocityY(-speed)
			if (this.input.keyboard!.addKey('S').isDown) playerBody.setVelocityY(speed)
		}

		// 限制玩家移动在发射区域（左上起点附近）
		if (playerBody) {
			const minX = 64
			const maxX = 224 // 发射区宽度
			const minY = 64
			const maxY = 160
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && target.eid >= 0 && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				// destroy physics body if present
				if (target.body) {
					target.body.destroy()
				}

				if (target.taskId === 'T1') {
					this.completeObjectiveById('T1')
					this.unlockTask2()
					this.cameras.main.flash(200, 0, 255, 0)
				} else if (target.taskId === 'T2') {
					this.completeObjectiveById('T2')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 165, 0)
				} else if (target.taskId === 'T3') {
					this.completeObjectiveById('T3')
					this.cameras.main.flash(200, 255, 0, 255)
				}
			}
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'T2')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)
			if (task2Target.body) {
				task2Target.body.setVisible(true)
				// enable physics body so it can be hit
				if ((task2Target.body.body as any)) (task2Target.body.body as any).enable = true
			}

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

		const task3Target = this.targets.find(t => t.taskId === 'T3')
		if (task3Target) {
			task3Target.marker.setVisible(true)
			task3Target.label.setVisible(true)
			if (task3Target.body) {
				task3Target.body.setVisible(true)
				if ((task3Target.body.body as any)) (task3Target.body.body as any).enable = true
			}

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

		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 提示绑定
        console.log('[Level15] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
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
		Lifetime.lifetimeMs[eid] = 8000

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

		const body = createRectBody(this, `target-${taskId}`, color, 50, 50, x, y, 3)
		body.setImmovable(true)
		body.setVisible(visible)
		// disable physics when hidden
		if ((body.body as any)) (body.body as any).enable = visible

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
