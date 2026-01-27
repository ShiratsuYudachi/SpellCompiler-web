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
		// 15列 x 9行 = 960x576
		// 设计：玩家区(3列) | 第一墙(1列+过道) | 区域1 | 第二墙 | 区域2 | 第三墙 | 区域3
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 墙上方有过道
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // 第一墙有缺口(过道)
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 玩家水平线
		[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // 第二墙有缺口
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
		[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 墙下方有过道
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
			'【Level 11: 折射初探】\n\n' +
			'学习使用 deflectAfterTime(angle, delayMs) 控制火球偏转。\n\n' +
			'• angle: 偏转角度（正数向上，负数向下）\n' +
			'• delayMs: 延迟时间（毫秒）\n\n' +
			'火球速度 = 250 px/s\n' +
			'火球碰到墙壁会消失！\n\n' +
			'按 TAB 编辑法术。\n' +
			'按 1 发射火球并施放法术。'
		)

		// 锁定玩家位置在左侧区域
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 288)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// 根据地形布局设置目标位置
		// 地形：15列x9行，tileSize=64
		// 玩家在 x=96 (第1-2列)
		// 第一墙在 x=256 (第4列)，过道在 row=3 (y=224)
		// 第二墙在 x=512 (第8列)，过道在 row=5 (y=352)
		// 第三墙在 x=768 (第12列)，过道在 row=3 (y=224)

		// Task 1: 第一道墙后的目标 - 通过上方过道 (row=3, x~384)
		// 火球需要 30° 向上偏转，延迟 400ms
		// 位置: 在第一墙和第二墙之间的上方区域
		this.createTarget(384, 160, 'Task 1: 30°, 400ms', 0x00ff00, 'task1-corridor', true)

		// Task 2: 第二道墙后的目标 - 通过下方过道 (row=5, x~640)
		// 火球需要 -30° 向下偏转，延迟 800ms
		// 位置: 在第二墙和第三墙之间的下方区域
		this.createTarget(640, 416, 'Task 2: -30°, 800ms', 0xffaa00, 'task2-deep', false)

		// Task 3: 最远的目标 - 需要精确控制
		// 火球需要 15° 小角度偏转，延迟 600ms
		// 位置: 在第三墙后的区域
		this.createTarget(864, 224, 'Task 3: 15°, 600ms', 0xff00ff, 'task3-cover', false)

		// 绑定按键 '1' 发射火球 + 施放法术
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 锁定玩家在左侧区域（只允许在玩家区域内移动）
		if (playerBody) {
			const minX = 64
			const maxX = 192 // 第一墙前
			const minY = 96
			const maxY = 480
			if (playerBody.x < minX) playerBody.x = minX
			if (playerBody.x > maxX) playerBody.x = maxX
			if (playerBody.y < minY) playerBody.y = minY
			if (playerBody.y > maxY) playerBody.y = maxY
		}

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()
				target.body.destroy()

				// 完成对应任务并解锁下一个
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

		// 显示 Task 2 目标（包括 body）
		const task2Target = this.targets.find(t => t.taskId === 'task2-deep')
		if (task2Target) {
			task2Target.marker.setVisible(true)
			task2Target.label.setVisible(true)
			task2Target.body.setVisible(true)

			// 添加出现动画
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

		// 显示 Task 3 目标（包括 body）
		const task3Target = this.targets.find(t => t.taskId === 'task3-cover')
		if (task3Target) {
			task3Target.marker.setVisible(true)
			task3Target.label.setVisible(true)
			task3Target.body.setVisible(true)

			// 添加出现动画
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

		// 1. 发射火球（固定向右）
		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 2. 提示绑定
        console.log('[Level11] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
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

		// 延长生命周期（5秒）以便穿越复杂地形
		Lifetime.bornAt[eid] = Date.now()
		Lifetime.lifetimeMs[eid] = 5000

		Velocity.x[eid] = dirX * FireballStats.speed[eid]
		Velocity.y[eid] = dirY * FireballStats.speed[eid]

		return eid
	}

	private createTarget(x: number, y: number, labelText: string, color: number, taskId: string, visible: boolean) {
		// 创建视觉标记
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

		// 创建敌人实体 - 注意：body 也需要根据 visible 设置可见性
		const body = createRectBody(this, `target-${taskId}`, color, 50, 50, x, y, 3)
		body.setImmovable(true)
		body.setVisible(visible) // 隐藏任务的 body 也应该隐藏

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
