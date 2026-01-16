/**
 * Level 11 - 折射初探（基础赋值与时空预判）
 *
 * 编程概念：变量赋值 (Variable Assignment) —— 学习设置 Angle(y) 与 Delay(x)
 * 地形：封闭实验室。前方有三道高墙，每道墙后藏有一个敌人。
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'

export class Level11 extends BaseScene {
	private targets: Array<{
		eid: number
		marker: Phaser.GameObjects.Arc
		label: Phaser.GameObjects.Text
		destroyed: boolean
	}> = []

	private plateStatusText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level11' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 11: 折射初探】\n' +
			'学习使用 deflectAfterTime(angle, delay) 控制子弹偏转。\n' +
			'踩压力板可以触发条件判断。\n\n' +
			'按 TAB 编辑法术。\n' +
			'按 1 发射火球并施放法术。'
		)

		// 创建三个目标敌人
		// Task 1: 左侧 30° 过道口 - 需要 y=30, delay=400ms
		this.createTarget(500, 200, 'Task 1: Left Passage (30°)', 0xff6600)

		// Task 2: 右侧 -30° 过道深处 - 需要 y=-30, delay=800ms
		this.createTarget(550, 400, 'Task 2: Right Passage (-30°)', 0xffaa00)

		// Task 3: 掩体后 - 需要 y=15, delay=600ms
		this.createTarget(700, 300, 'Task 3: Behind Cover (15°)', 0xff00ff)

		// 锁定玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(150, 300)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 创建压力板状态显示
		this.plateStatusText = this.add.text(20, 80, 'Plate: NONE', {
			fontSize: '16px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 绑定按键 '1' 发射火球 + 施放法术
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 锁定玩家位置（只允许左右移动来踩压力板）
		if (playerBody) {
			// 允许玩家在一定范围内移动
			const minX = 100
			const maxX = 250
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
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

		// 检测目标销毁
		this.targets.forEach((target, index) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				// 完成对应任务
				if (index === 0) {
					this.completeObjectiveById('task1-left')
				} else if (index === 1) {
					this.completeObjectiveById('task2-right')
				} else if (index === 2) {
					this.completeObjectiveById('task3-cover')
				}

				this.cameras.main.flash(200, 0, 255, 0)
			}
		})
	}

	private shootAndCastSpell() {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		// 1. 发射火球（固定向右）
		this.spawnFireball(playerBody.x, playerBody.y, 1, 0)

		// 2. 立即施放法术
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				castSpell(this.world, playerEid, spell)
				console.log('[Level11] Spell cast successfully')
			} catch (err) {
				console.error('[Level11] Spell error:', err)
			}
		} else {
			console.warn('[Level11] No spell equipped. Use TAB to create a spell.')
		}
	}

	private spawnFireball(x: number, y: number, dirX: number, dirY: number) {
		// 确保火球纹理存在
		const key = 'fireball'
		if (!this.textures.exists(key)) {
			const g = this.add.graphics()
			g.fillStyle(0xffaa33, 1)
			g.fillCircle(6, 6, 6)
			g.generateTexture(key, 12, 12)
			g.destroy()
		}

		// 创建物理体
		const body = this.physics.add.image(x, y, key)
		body.setDepth(20)

		// 创建 ECS 实体
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

		FireballStats.speed[eid] = 300
		FireballStats.damage[eid] = 50
		FireballStats.hitRadius[eid] = 16
		FireballStats.initialX[eid] = x
		FireballStats.initialY[eid] = y
		FireballStats.pendingDeflection[eid] = 0
		FireballStats.deflectAtTime[eid] = 0
		// Plate-based deflection (initialized to 0, will be set by spell)
		FireballStats.deflectOnPlateColor[eid] = 0
		FireballStats.deflectOnPlateAngle[eid] = 0
		FireballStats.plateDeflected[eid] = 0

		// 延长生命周期（5秒）
		Lifetime.bornAt[eid] = Date.now()
		Lifetime.lifetimeMs[eid] = 5000

		Velocity.x[eid] = dirX * FireballStats.speed[eid]
		Velocity.y[eid] = dirY * FireballStats.speed[eid]

		return eid
	}

	private createTarget(x: number, y: number, labelText: string, color: number) {
		// 创建视觉标记
		const marker = this.add.circle(x, y, 20, color, 0.5).setStrokeStyle(3, color)
		const label = this.add.text(x, y - 40, labelText, {
			fontSize: '12px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// 创建敌人实体
		const body = createRectBody(this, 'target', color, 40, 40, x, y, 3)
		body.setImmovable(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = 10
		Health.current[eid] = 10

		this.targets.push({ eid, marker, label, destroyed: false })
	}
}
