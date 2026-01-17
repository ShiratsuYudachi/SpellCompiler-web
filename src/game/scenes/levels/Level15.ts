/**
 * Level 15 - 时空预判（时序控制）
 *
 * 编程概念：时序控制 (Timing Control) —— 精确控制动作的执行时机
 *
 * 关卡目标：学习通过调整 delay 参数精确控制火球偏转时机
 *
 * Task 1: 穿过旋转缝隙 - 计算正确的偏转时机
 * Task 2: 双重偏转 - 使用两次连续偏转
 * Task 3: 终极挑战 - 结合时序和多重偏转
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

interface RotatingBarrier {
	graphics: Phaser.GameObjects.Graphics
	x: number
	y: number
	angle: number
	length: number
	gapAngle: number // 缝隙的角度范围
	rotationSpeed: number
}

export class Level15 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	// 旋转障碍物
	private barriers: RotatingBarrier[] = []

	// 状态显示
	private timingText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level15' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 15: 时空预判】\n\n' +
			'学习精确控制火球偏转的时机。\n\n' +
			'• 旋转障碍物每 4 秒旋转一周\n' +
			'• 只有缝隙处可以通过\n' +
			'• 精确计算 delay 参数\n\n' +
			'提示：火球速度 = 220 px/s\n\n' +
			'按 TAB 编辑法术，按 1 发射火球。'
		)

		// 锁定玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(100, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 时序提示
		this.timingText = this.add.text(20, 80, 'Barrier Angle: 0°', {
			fontSize: '14px',
			color: '#00ffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 创建旋转障碍物（Task 1）
		this.createRotatingBarrier(400, 288, 150, 60, 0.025) // 60° 缝隙

		// Task 1: 穿过旋转缝隙
		this.createTarget(650, 288, 'Task 1: Through the Gap', 0x00ff00, 'task1-timing', true)

		// Task 2: 双重偏转（初始隐藏）
		this.createTarget(750, 150, 'Task 2: Double Deflect', 0xffaa00, 'task2-sequence', false)

		// Task 3: 终极挑战（初始隐藏）
		this.createTarget(850, 400, 'Task 3: Master Challenge', 0xff00ff, 'task3-master', false)

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
			const minX = 60
			const maxX = 200
			const minY = 200
			const maxY = 380
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 更新旋转障碍物
		this.updateBarriers()

		// 检查火球与障碍物碰撞
		this.checkBarrierCollisions()

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				if (target.taskId === 'task1-timing') {
					this.completeObjectiveById('task1-timing')
					this.unlockTask2()
					this.cameras.main.flash(200, 0, 255, 0)
				} else if (target.taskId === 'task2-sequence') {
					this.completeObjectiveById('task2-sequence')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 165, 0)
				} else if (target.taskId === 'task3-master') {
					this.completeObjectiveById('task3-master')
					this.cameras.main.flash(200, 255, 0, 255)
				}
			}
		})
	}

	private createRotatingBarrier(x: number, y: number, length: number, gapAngle: number, rotationSpeed: number) {
		const graphics = this.add.graphics()
		graphics.setDepth(15)

		this.barriers.push({
			graphics,
			x,
			y,
			angle: 0,
			length,
			gapAngle,
			rotationSpeed
		})
	}

	private updateBarriers() {
		this.barriers.forEach((barrier, index) => {
			// 更新角度
			barrier.angle += barrier.rotationSpeed
			if (barrier.angle >= Math.PI * 2) {
				barrier.angle -= Math.PI * 2
			}

			// 重绘障碍物
			barrier.graphics.clear()
			barrier.graphics.lineStyle(8, 0xff6600, 0.9)

			// 绘制除缝隙外的圆弧
			const gapStart = barrier.angle
			const gapEnd = barrier.angle + (barrier.gapAngle * Math.PI / 180)

			// 绘制两段弧
			barrier.graphics.beginPath()
			barrier.graphics.arc(barrier.x, barrier.y, barrier.length, gapEnd, gapStart + Math.PI * 2, false)
			barrier.graphics.strokePath()

			// 更新时序显示
			if (index === 0) {
				const angleDeg = Math.round((barrier.angle * 180 / Math.PI) % 360)
				this.timingText.setText(`Barrier Angle: ${angleDeg}°`)
			}
		})
	}

	private checkBarrierCollisions() {
		this.barriers.forEach(barrier => {
			this.world.resources.bodies.forEach((body, eid) => {
				// 检查是否是火球
				if (FireballStats.speed[eid] === undefined) return

				const dx = body.x - barrier.x
				const dy = body.y - barrier.y
				const dist = Math.sqrt(dx * dx + dy * dy)

				// 检查是否在障碍物半径范围内
				if (Math.abs(dist - barrier.length) < 15) {
					// 计算火球相对于障碍物中心的角度
					let fireballAngle = Math.atan2(dy, dx)
					if (fireballAngle < 0) fireballAngle += Math.PI * 2

					// 计算缝隙范围
					let gapStart = barrier.angle
					let gapEnd = barrier.angle + (barrier.gapAngle * Math.PI / 180)

					// 规范化角度
					if (gapStart < 0) gapStart += Math.PI * 2
					if (gapEnd < 0) gapEnd += Math.PI * 2
					if (gapEnd >= Math.PI * 2) gapEnd -= Math.PI * 2

					// 检查火球是否在缝隙内
					let inGap = false
					if (gapStart < gapEnd) {
						inGap = fireballAngle >= gapStart && fireballAngle <= gapEnd
					} else {
						// 缝隙跨越 0°
						inGap = fireballAngle >= gapStart || fireballAngle <= gapEnd
					}

					if (!inGap) {
						// 火球撞到障碍物
						body.destroy()
						this.world.resources.bodies.delete(eid)

						// 显示碰撞效果
						const flash = this.add.circle(body.x, body.y, 15, 0xff6600, 0.8)
						this.tweens.add({
							targets: flash,
							alpha: 0,
							scale: 2,
							duration: 200,
							onComplete: () => flash.destroy()
						})
					}
				}
			})
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-sequence')
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

		// 添加第二个障碍物
		this.createRotatingBarrier(550, 200, 100, 45, -0.03)
	}

	private unlockTask3() {
		if (this.task3Unlocked) return
		this.task3Unlocked = true

		const task3Target = this.targets.find(t => t.taskId === 'task3-master')
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

		// 添加第三个障碍物（更复杂的位置）
		this.createRotatingBarrier(700, 350, 80, 40, 0.035)
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
