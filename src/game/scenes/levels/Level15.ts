/**
 * Level 15 - 闪电回廊 (状态机挑战)
 *
 * 编程概念：多重条件分支 (Else-If Chains) —— 根据不同条件执行不同操作
 *
 * 关卡目标：学习使用 if-else if 结构处理多个压力板的触发条件
 *
 * 任务分阶段：玩家需要通过多次经过红/黄压力板并根据顺序改变行为（状态机挑战）
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'

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

		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				castSpell(this.world, playerEid, spell)
				console.log('[Level15] Spell cast successfully')
			} catch (err) {
				console.error('[Level15] Spell error:', err)
			}
		} else {
			console.warn('[Level15] No spell equipped. Use TAB to create a spell.')
		}
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
