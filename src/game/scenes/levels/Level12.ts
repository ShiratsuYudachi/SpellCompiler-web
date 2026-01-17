/**
 * Level 12 - 安全分流（If-Else 条件分支）
 *
 * 编程概念：条件分支 (If-Else) —— 根据条件选择不同执行路径
 *
 * 关卡目标：学习使用 If 节点根据压力板状态选择不同的偏转角度
 *
 * Task 1: 红色路线 - 踩红色压力板时向上偏转 45°
 * Task 2: 黄色路线 - 踩黄色压力板时向下偏转 -45°
 * Task 3: 安全通道 - 根据护盾状态选择路径（护盾开启时直行，关闭时偏转）
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

export class Level12 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	// 护盾相关
	private shield: Phaser.GameObjects.Rectangle | null = null
	private shieldActive = true
	private shieldToggleTimer: Phaser.Time.TimerEvent | null = null
	private shieldStatusText!: Phaser.GameObjects.Text

	// 压力板状态显示
	private plateStatusText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level12' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 12: 安全分流】\n\n' +
			'学习使用 If 节点进行条件分支。\n\n' +
			'• 使用 getPlayerPlateColor 获取玩家所在压力板颜色\n' +
			'• 使用 equals 节点比较颜色\n' +
			'• 使用 If 节点选择不同偏转角度\n\n' +
			'提示：If(condition, trueValue, falseValue)\n\n' +
			'按 TAB 编辑法术，按 1 发射火球。'
		)

		// 锁定玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(150, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 创建压力板状态显示
		this.plateStatusText = this.add.text(20, 80, 'Plate: NONE', {
			fontSize: '16px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Task 1: 红色路线目标（初始可见）
		// 踩红色压力板，火球向上偏转 45° 击中目标
		this.createTarget(550, 120, 'Task 1: RED -> 45°', 0xff4444, 'task1-red', true)

		// Task 2: 黄色路线目标（初始隐藏）
		// 踩黄色压力板，火球向下偏转 -45° 击中目标
		this.createTarget(550, 450, 'Task 2: YELLOW -> -45°', 0xffff44, 'task2-yellow', false)

		// Task 3: 护盾后的目标（初始隐藏）
		// 需要根据护盾状态判断：护盾关闭时直行，开启时偏转绕过
		this.createTarget(750, 288, 'Task 3: Shield Logic', 0x44ff44, 'task3-shield', false)

		// 创建护盾（Task 3 的障碍物）- 初始隐藏
		this.shield = this.add.rectangle(600, 288, 20, 150, 0x00ffff, 0.7)
		this.shield.setStrokeStyle(3, 0x00ffff)
		this.shield.setVisible(false)

		// 护盾状态显示 - 初始隐藏
		this.shieldStatusText = this.add.text(600, 200, 'Shield: ON', {
			fontSize: '14px',
			color: '#00ffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)
		this.shieldStatusText.setVisible(false)

		// 绑定按键 '1' 发射火球 + 施放法术
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 锁定玩家位置（允许踩压力板）
		if (playerBody) {
			const minX = 80
			const maxX = 280
			const minY = 150
			const maxY = 420
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 更新压力板状态显示
		const plateColor = this.world.resources.currentPlateColor
		this.plateStatusText.setText(`Plate: ${plateColor}`)
		if (plateColor === 'RED') {
			this.plateStatusText.setColor('#ff6666')
		} else if (plateColor === 'YELLOW') {
			this.plateStatusText.setColor('#ffff66')
		} else {
			this.plateStatusText.setColor('#ffffff')
		}

		// 更新护盾状态显示
		if (this.task3Unlocked && this.shieldStatusText.visible) {
			this.shieldStatusText.setText(`Shield: ${this.shieldActive ? 'ON' : 'OFF'}`)
			this.shieldStatusText.setColor(this.shieldActive ? '#00ffff' : '#666666')
			if (this.shield) {
				this.shield.setAlpha(this.shieldActive ? 0.7 : 0.2)
			}
		}

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				// 完成对应任务并解锁下一个
				if (target.taskId === 'task1-red') {
					this.completeObjectiveById('task1-red')
					this.unlockTask2()
					this.cameras.main.flash(200, 255, 0, 0)
				} else if (target.taskId === 'task2-yellow') {
					this.completeObjectiveById('task2-yellow')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 255, 0)
				} else if (target.taskId === 'task3-shield') {
					this.completeObjectiveById('task3-shield')
					this.stopShieldToggle()
					this.cameras.main.flash(200, 0, 255, 0)
				}
			}
		})

		// Task 3: 护盾阻挡火球
		if (this.task3Unlocked && this.shield && this.shieldActive) {
			this.checkShieldCollision()
		}
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-yellow')
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

		const task3Target = this.targets.find(t => t.taskId === 'task3-shield')
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

		// 显示护盾
		if (this.shield) {
			this.shield.setVisible(true)
		}
		this.shieldStatusText.setVisible(true)

		// 启动护盾切换计时器（每2秒切换一次）
		this.startShieldToggle()
	}

	private startShieldToggle() {
		this.shieldToggleTimer = this.time.addEvent({
			delay: 2000,
			callback: () => {
				this.shieldActive = !this.shieldActive
			},
			loop: true
		})
	}

	private stopShieldToggle() {
		if (this.shieldToggleTimer) {
			this.shieldToggleTimer.destroy()
			this.shieldToggleTimer = null
		}
		if (this.shield) {
			this.shield.destroy()
			this.shield = null
		}
		this.shieldStatusText.setVisible(false)
	}

	private checkShieldCollision() {
		if (!this.shield) return

		const shieldBounds = this.shield.getBounds()

		// 检查所有火球
		this.world.resources.bodies.forEach((body, eid) => {
			if (Fireball[eid as keyof typeof Fireball] === undefined) return

			const fireballBounds = body.getBounds()
			if (Phaser.Geom.Intersects.RectangleToRectangle(fireballBounds, shieldBounds)) {
				// 火球被护盾阻挡，销毁
				body.destroy()
				this.world.resources.bodies.delete(eid)

				// 显示阻挡效果
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

		// 1. 发射火球（固定向右）
		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 2. 立即施放法术
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				castSpell(this.world, playerEid, spell)
				console.log('[Level12] Spell cast successfully')
			} catch (err) {
				console.error('[Level12] Spell error:', err)
			}
		} else {
			console.warn('[Level12] No spell equipped. Use TAB to create a spell.')
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
