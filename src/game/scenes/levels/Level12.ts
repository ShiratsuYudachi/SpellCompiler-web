/**
 * Level 12 - 安全分流（If-Else 条件分支）
 *
 * 编程概念：条件判断 (If-Else) —— 根据压力板状态分流子弹轨迹
 *
 * 地形：走廊中央有红色压力板，正前方悬浮一面无法击穿的磁能盾
 *
 * Task 1: 左侧绕后
 *   - 踩红板时触发，延迟0.5s后偏转-35°绕过盾牌击中左后方目标
 *   - IF (Plate == RED) { angle = -35 } ELSE { angle = 0 }
 *
 * Task 2: 右侧绕后
 *   - 同样踩红板，但偏转+35°击中右后方目标
 *   - 修改角度参数即可
 *
 * Task 3: 走位分流测试
 *   - 左右各一敌人，只能释放一次代码
 *   - 第一发：踩红板 -> 偏转击中一侧
 *   - 第二发：不踩板 -> 直行击中另一侧（通过盾牌缺口）
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

export class Level12 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	// 磁能盾 - 中空设计（上下两块，中间有缺口）
	private shieldTop: Phaser.GameObjects.Rectangle | null = null
	private shieldBottom: Phaser.GameObjects.Rectangle | null = null
	private shieldTopBounds: Phaser.Geom.Rectangle | null = null
	private shieldBottomBounds: Phaser.Geom.Rectangle | null = null

	// 压力板状态显示
	private plateStatusText!: Phaser.GameObjects.Text

	// Task 3 计数
	private task3TargetsDestroyed = 0

	constructor() {
		super({ key: 'Level12' })
	}

	// 重置关卡状态（每次进入关卡时调用）
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
		// 每次进入关卡时重置状态
		this.resetLevelState()
		this.showInstruction(
			'【Level 12: 安全分流】\n\n' +
			'学习使用 If 节点进行条件分支。\n\n' +
			'• getPlayerPlateColor(): 获取玩家所在压力板颜色\n' +
			'• If(condition, trueValue, falseValue)\n\n' +
			'逻辑：\n' +
			'IF (踩红板) { 偏转绕过盾牌 }\n' +
			'ELSE { 直行 }\n\n' +
			'盾牌会阻挡正面飞来的火球！\n\n' +
			'按 TAB 编辑法术，按 1 发射火球。'
		)

		// 锁定玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 创建压力板状态显示
		this.plateStatusText = this.add.text(20, 80, 'Plate: NONE', {
			fontSize: '16px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 创建磁能盾 - 中空设计（上下两块，中间有缺口让火球穿过）
		// 位置：x=544 (盾牌后移到第8-9列之间)
		// 中间缺口高度约80px，火球从中间穿过后再偏转
		const shieldX = 544
		const shieldWidth = 20
		const gapHeight = 80 // 中间缺口高度
		const shieldHeight = 80 // 每块盾牌高度

		// 上半部分盾牌
		this.shieldTop = this.add.rectangle(shieldX, 288 - gapHeight / 2 - shieldHeight / 2, shieldWidth, shieldHeight, 0x00ffff, 0.7)
		this.shieldTop.setStrokeStyle(3, 0x00ffff)
		this.shieldTopBounds = this.shieldTop.getBounds()

		// 下半部分盾牌
		this.shieldBottom = this.add.rectangle(shieldX, 288 + gapHeight / 2 + shieldHeight / 2, shieldWidth, shieldHeight, 0x00ffff, 0.7)
		this.shieldBottom.setStrokeStyle(3, 0x00ffff)
		this.shieldBottomBounds = this.shieldBottom.getBounds()

		// 盾牌标签
		this.add.text(shieldX, 288 - gapHeight / 2 - shieldHeight - 15, '⚡ Shield', {
			fontSize: '12px',
			color: '#00ffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// 中间缺口指示
		this.add.text(shieldX, 288, '→', {
			fontSize: '16px',
			color: '#00ffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// 计算目标位置
		// tileSize = 64, 地图 15x9
		// 盾牌在 x=544，目标在盾牌后方
		// 火球从中间缺口穿过后偏转击中目标

		// Task 1: 上方目标（盾牌后上方）
		// 火球从中间穿过后向上偏转 -35° 击中
		this.createTarget(750, 128, 'Task 1: UP', 0xff4444, 'task1-left', true)

		// Task 2: 下方目标（盾牌后下方）- 初始隐藏
		// 火球从中间穿过后向下偏转 +35° 击中
		this.createTarget(750, 448, 'Task 2: DOWN', 0x44ff44, 'task2-right', false)

		// Task 3: 分流测试 - 两个目标同时出现 - 初始隐藏
		// 上方目标：需要踩板偏转（靠上）
		// 下方目标：需要不踩板直行（靠下）
		// 把两个目标稍微分开（防止重叠或被遮挡），并保持初始隐藏
		this.createTarget(820, 160, 'Task 3-A: Deflect', 0xffaa00, 'task3-deflect', false)
		this.createTarget(820, 360, 'Task 3-B: Straight', 0xffaa00, 'task3-straight', false)

		// 绑定按键 '1' 发射火球 + 施放法术
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 锁定玩家在左侧区域（可以踩到压力板或离开）
		if (playerBody) {
			const minX = 64
			const maxX = 280 // 盾牌前
			const minY = 96
			const maxY = 480
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
		} else {
			this.plateStatusText.setColor('#ffffff')
		}

		// 检查火球与盾牌碰撞
		this.checkShieldCollision()

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				target.body.destroy()

				// 完成对应任务
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

					// 两个目标都被消灭才算完成 Task 3
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

		// Task 3 不需要调整盾牌，因为中空设计已经允许直行通过

		// 显示 Task 3 的两个目标
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

		// 提示 Task 3 规则
		this.add.text(480, 50, '⚠️ Task 3: 用同一套代码击中两个目标！\n第一发踩板偏转，第二发不踩板直行', {
			fontSize: '12px',
			color: '#ffaa00',
			stroke: '#000000',
			strokeThickness: 2,
			align: 'center',
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000)
	}

	private checkShieldCollision() {
		// 检查上半部分盾牌
		if (this.shieldTop && this.shieldTopBounds) {
			this.shieldTopBounds = this.shieldTop.getBounds()
			this.checkCollisionWithShieldPart(this.shieldTopBounds)
		}

		// 检查下半部分盾牌
		if (this.shieldBottom && this.shieldBottomBounds) {
			this.shieldBottomBounds = this.shieldBottom.getBounds()
			this.checkCollisionWithShieldPart(this.shieldBottomBounds)
		}
	}

	private checkCollisionWithShieldPart(bounds: Phaser.Geom.Rectangle) {
		// 检查所有火球
		this.world.resources.bodies.forEach((body, eid) => {
			// 检查是否是火球
			if (FireballStats.speed[eid] === undefined) return

			if (
				body.x > bounds.left &&
				body.x < bounds.right &&
				body.y > bounds.top &&
				body.y < bounds.bottom
			) {
				// 火球被盾牌阻挡
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

		// 创建敌人实体 - body 也根据 visible 设置
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
