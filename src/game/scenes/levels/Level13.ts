import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level13Meta: LevelMeta = {
	key: 'Level13',
	playerSpawnX: 96,
	playerSpawnY: 192,
	tileSize: 64,
	mapData: [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1],
		[1, 0, 0, 0, 5, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1],
		[1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 6, 0, 0, 1, 1, 1, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	objectives: [
		{
			id: 'task1-red-up',
			description: 'Task 1: IF fireball on RED -> deflect UP (-45°)',
			type: 'defeat',
		},
		{
			id: 'task2-straight',
			description: 'Task 2: ELSE IF fireball on YELLOW -> do nothing, hit T2',
			type: 'defeat',
			prerequisite: 'task1-red-up',
		},
		{
			id: 'task3-yellow-vshape',
			description: 'Task 3: ELSE IF fireball on YELLOW -> deflect UP (-60°) for V-shape',
			type: 'defeat',
			prerequisite: 'task2-straight',
		},
	],
}

levelRegistry.register(Level13Meta)

interface TargetInfo {
	eid: number
	body: Phaser.Physics.Arcade.Image
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
	private fireballPlateText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level13' })
	}

	private resetLevelState(): void {
		this.targets = []
		this.task2Unlocked = false
		this.task3Unlocked = false
	}

	protected onLevelCreate(): void {
		this.resetLevelState()

		this.showInstruction(
			'【Level 13: 多重制导】\n\n' +
			'学习使用嵌套 If 实现 Else-If 多分支逻辑。\n\n' +
			'火球飞行时会经过压力板：\n' +
			'• getFireballPlateColor() 检测火球位置\n' +
			'• deflectOnPlate("RED", angle) 在红板偏转\n' +
			'• deflectOnPlate("YELLOW", angle) 在黄板偏转\n\n' +
			'Task 1: 火球经过 RED → 向上偏转击中 T1\n' +
			'Task 2: 火球经过 YELLOW → 不偏转，直行击中 T2\n' +
			'Task 3: 火球经过 YELLOW → 向上偏转(V字形)击中 T3\n\n' +
			'按 TAB 编辑法术，按 1 发射火球。'
		)

		// 玩家位置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 192)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 玩家压力板状态显示
		this.plateStatusText = this.add.text(20, 80, 'Player Plate: NONE', {
			fontSize: '14px',
			color: '#ffffff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 火球压力板状态显示
		this.fireballPlateText = this.add.text(20, 110, 'Fireball Plate: NONE', {
			fontSize: '14px',
			color: '#ffaa33',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 创建目标 - 根据用户草图
		// tileSize=64
		// RED压力板在 (4, 2) = (288, 160)
		// YELLOW压力板在 (8, 7) = (544, 480)

		// T1: 红板上方区域 (火球从RED偏转后向上飞到这里)
		this.createTarget(288, 96, 'T1', 0xff4444, 'task1-red-up', true)

		// T2: 右上区域 (火球不触发RED，沿通道向右下飞，不触发YELLOW，继续向右上飞到这里)
		this.createTarget(832, 160, 'T2', 0x44ff44, 'task2-straight', false)

		// T3: YELLOW压力板右侧 (火球从YELLOW偏转后向右上飞，V字形)
		this.createTarget(640, 480, 'T3', 0xffff44, 'task3-yellow-vshape', false)

		// 绑定按键
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})

		// 添加路径提示
		this.addPathHints()
	}

	private addPathHints(): void {
		// 红色压力板位置标注 - (4, 2) = (288, 160)
		this.add.text(288, 130, '🔴 RED', {
			fontSize: '12px',
			color: '#ff6666',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)

		// 黄色压力板位置标注 - (8, 7) = (544, 480)
		this.add.text(544, 450, '🟡 YELLOW', {
			fontSize: '12px',
			color: '#ffff66',
			stroke: '#000000',
			strokeThickness: 2,
		}).setOrigin(0.5)
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 限制玩家移动范围（左上角玩家区域）
		if (playerBody) {
			const minX = 64
			const maxX = 240
			const minY = 64
			const maxY = 240
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 更新玩家压力板状态显示
		const plateColor = this.world.resources.currentPlateColor
		this.plateStatusText.setText(`Player Plate: ${plateColor}`)
		if (plateColor === 'RED') {
			this.plateStatusText.setColor('#ff6666')
		} else if (plateColor === 'YELLOW') {
			this.plateStatusText.setColor('#ffff66')
		} else {
			this.plateStatusText.setColor('#ffffff')
		}

		// 更新火球压力板状态显示
		const fireballPlate = this.getActiveFireballPlateColor()
		this.fireballPlateText.setText(`Fireball Plate: ${fireballPlate}`)
		if (fireballPlate === 'RED') {
			this.fireballPlateText.setColor('#ff6666')
		} else if (fireballPlate === 'YELLOW') {
			this.fireballPlateText.setColor('#ffff66')
		} else {
			this.fireballPlateText.setColor('#ffaa33')
		}

		// 检测目标销毁
		this.targets.forEach((target) => {
			// 只检查已激活的目标 (eid >= 0)
			if (target.eid >= 0 && !target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				target.body.destroy()

				if (target.taskId === 'task1-red-up') {
					this.completeObjectiveById('task1-red-up')
					this.unlockTask2()
					this.cameras.main.flash(200, 255, 0, 0)
				} else if (target.taskId === 'task2-straight') {
					this.completeObjectiveById('task2-straight')
					this.unlockTask3()
					this.cameras.main.flash(200, 0, 255, 0)
				} else if (target.taskId === 'task3-yellow-vshape') {
					this.completeObjectiveById('task3-yellow-vshape')
					this.cameras.main.flash(200, 255, 255, 0)
				}
			}
		})
	}

	private getActiveFireballPlateColor(): string {
		// 查找当前活跃的火球并检测其压力板颜色
		for (const [eid, body] of this.world.resources.bodies) {
			if (FireballStats.speed[eid] !== undefined && body.active) {
				for (const plate of this.world.resources.pressurePlates) {
					const bounds = plate.rect.getBounds()
					if (body.x > bounds.left && body.x < bounds.right &&
						body.y > bounds.top && body.y < bounds.bottom) {
						return plate.color
					}
				}
			}
		}
		return 'NONE'
	}

	private activateTarget(target: TargetInfo): void {
		if (target.eid >= 0) return

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, target.body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = 10
		Health.current[eid] = 10

		target.eid = eid
	}

	private unlockTask2(): void {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-straight')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)
			task2Target.body.setVisible(true)

			this.activateTarget(task2Target)

			this.tweens.add({
				targets: [task2Target.marker, task2Target.label, task2Target.body],
				alpha: { from: 0, to: 1 },
				scale: { from: 0.5, to: 1 },
				duration: 500,
				ease: 'Back.easeOut'
			})
		}
	}

	private unlockTask3(): void {
		if (this.task3Unlocked) return
		this.task3Unlocked = true

		const task3Target = this.targets.find(t => t.taskId === 'task3-yellow-vshape')
		if (task3Target) {
			task3Target.marker.setVisible(true)
			task3Target.label.setVisible(true)
			task3Target.body.setVisible(true)

			this.activateTarget(task3Target)

			this.tweens.add({
				targets: [task3Target.marker, task3Target.label, task3Target.body],
				alpha: { from: 0, to: 1 },
				scale: { from: 0.5, to: 1 },
				duration: 500,
				ease: 'Back.easeOut'
			})
		}

		// Task 3 提示
		this.add.text(480, 50, '⚠️ Task 3: V字形轨迹！\n火球经过YELLOW时向上偏转', {
			fontSize: '12px',
			color: '#ffff00',
			stroke: '#000000',
			strokeThickness: 2,
			align: 'center',
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000)
	}

	private shootAndCastSpell(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		// 发射火球（向右）
		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 提示绑定
        console.log('[Level13] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
	}

	private spawnFireball(x: number, y: number, dirX: number, dirY: number): number {
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

		FireballStats.speed[eid] = 180
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

	private createTarget(x: number, y: number, labelText: string, color: number, taskId: string, visible: boolean): void {
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

		let eid = -1
		if (visible) {
			// 只有可见目标才注册 ECS 实体（避免隐藏目标被火球击中）
			eid = spawnEntity(this.world)
			this.world.resources.bodies.set(eid, body)

			addComponent(this.world, eid, Sprite)
			addComponent(this.world, eid, Enemy)
			addComponent(this.world, eid, Health)

			Health.max[eid] = 10
			Health.current[eid] = 10
		}

		this.targets.push({ eid, body, marker, label, destroyed: false, taskId })
	}
}
