/**
 * Level 13 - 多重制导（Else-If 多分支）
 *
 * 编程概念：多分支条件 (Else-If) —— 多个条件的链式判断
 *
 * 关卡目标：学习使用嵌套 If 节点实现 Else-If 逻辑
 *
 * Task 1: 红色压力板 -> 向上偏转 60° 击中上方目标
 * Task 2: 黄色压力板 -> 向下偏转 -60° 击中下方目标
 * Task 3: 不踩压力板 -> 直行 (0°) 击中正前方目标
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'

interface TargetInfo {
	eid: number
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	destroyed: boolean
	taskId: string
}

export class Level13 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	private plateStatusText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level13' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 13: 多重制导】\n\n' +
			'学习使用嵌套 If 实现 Else-If 多分支逻辑。\n\n' +
			'• RED 压力板 -> 60° 向上\n' +
			'• YELLOW 压力板 -> -60° 向下\n' +
			'• 不踩压力板 -> 0° 直行\n\n' +
			'提示：If(isRed, 60, If(isYellow, -60, 0))\n\n' +
			'按 TAB 编辑法术，按 1 发射火球。'
		)

		// 锁定玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(150, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 压力板状态显示
		this.plateStatusText = this.add.text(20, 80, 'Plate: NONE', {
			fontSize: '16px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Task 1: 红色路线目标（上方）- 初始可见
		this.createTarget(600, 100, 'Task 1: RED -> 60°', 0xff4444, 'task1-red-up', true)

		// Task 2: 黄色路线目标（下方）- 初始隐藏
		this.createTarget(600, 476, 'Task 2: YELLOW -> -60°', 0xffff44, 'task2-yellow-down', false)

		// Task 3: 直行目标（正前方）- 初始隐藏
		this.createTarget(800, 288, 'Task 3: NONE -> 0°', 0x44ff44, 'task3-none-straight', false)

		// 绑定按键
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 锁定玩家位置
		if (playerBody) {
			const minX = 80
			const maxX = 280
			const minY = 100
			const maxY = 476
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 更新压力板状态
		const plateColor = this.world.resources.currentPlateColor
		this.plateStatusText.setText(`Plate: ${plateColor}`)
		if (plateColor === 'RED') {
			this.plateStatusText.setColor('#ff6666')
		} else if (plateColor === 'YELLOW') {
			this.plateStatusText.setColor('#ffff66')
		} else {
			this.plateStatusText.setColor('#ffffff')
		}

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				if (target.taskId === 'task1-red-up') {
					this.completeObjectiveById('task1-red-up')
					this.unlockTask2()
					this.cameras.main.flash(200, 255, 0, 0)
				} else if (target.taskId === 'task2-yellow-down') {
					this.completeObjectiveById('task2-yellow-down')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 255, 0)
				} else if (target.taskId === 'task3-none-straight') {
					this.completeObjectiveById('task3-none-straight')
					this.cameras.main.flash(200, 0, 255, 0)
				}
			}
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-yellow-down')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)

			this.tweens.add({
				targets: [task2Target.marker, task2Target.label],
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

		const task3Target = this.targets.find(t => t.taskId === 'task3-none-straight')
		if (task3Target) {
			task3Target.marker.setVisible(true)
			task3Target.label.setVisible(true)

			this.tweens.add({
				targets: [task3Target.marker, task3Target.label],
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
				console.log('[Level13] Spell cast successfully')
			} catch (err) {
				console.error('[Level13] Spell error:', err)
			}
		} else {
			console.warn('[Level13] No spell equipped. Use TAB to create a spell.')
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

		FireballStats.speed[eid] = 200
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
		Lifetime.lifetimeMs[eid] = 6000

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

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = 10
		Health.current[eid] = 10

		this.targets.push({ eid, marker, label, destroyed: false, taskId })
	}
}
