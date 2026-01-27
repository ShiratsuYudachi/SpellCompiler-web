import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level14Meta: LevelMeta = {
	key: 'Level14',
	playerSpawnX: 150,
	playerSpawnY: 288,
	tileSize: 64,
	mapData: [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	objectives: [
		{
			id: 'task1-red-sensor',
			description: 'Task 1: RED plate AND sensor ON -> deflect 45°',
			type: 'defeat',
		},
		{
			id: 'task2-yellow-sensor',
			description: 'Task 2: YELLOW plate AND sensor OFF -> deflect -45°',
			type: 'defeat',
			prerequisite: 'task1-red-sensor',
		},
		{
			id: 'task3-complex',
			description: 'Task 3: Combined logic with timing',
			type: 'defeat',
			prerequisite: 'task2-yellow-sensor',
		},
	],
}

levelRegistry.register(Level14Meta)

interface TargetInfo {
	eid: number
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	destroyed: boolean
	taskId: string
}

export class Level14 extends BaseScene {
	private targets: TargetInfo[] = []
	private task2Unlocked = false
	private task3Unlocked = false

	private plateStatusText!: Phaser.GameObjects.Text
	private sensorStatusText!: Phaser.GameObjects.Text

	// 传感器切换计时器
	private sensorToggleTimer: Phaser.Time.TimerEvent | null = null

	constructor() {
		super({ key: 'Level14' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 14: 精密验证】\n\n' +
			'学习使用 AND 节点组合多个条件。\n\n' +
			'• 传感器每 3 秒切换一次 ON/OFF\n' +
			'• Task 1: RED plate AND sensor ON -> 45°\n' +
			'• Task 2: YELLOW plate AND sensor OFF -> -45°\n\n' +
			'提示：And(condition1, condition2)\n\n' +
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

		// 传感器状态显示
		this.sensorStatusText = this.add.text(20, 110, 'Sensor: ON', {
			fontSize: '16px',
			color: '#00ff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// 初始化传感器状态
		this.world.resources.sensorState = true

		// 启动传感器切换计时器
		this.sensorToggleTimer = this.time.addEvent({
			delay: 3000,
			callback: () => {
				this.world.resources.sensorState = !this.world.resources.sensorState
			},
			loop: true
		})

		// Task 1: 红色 + 传感器开启 -> 45°
		this.createTarget(600, 120, 'Task 1: RED + ON -> 45°', 0xff4444, 'task1-red-sensor', true)

		// Task 2: 黄色 + 传感器关闭 -> -45°
		this.createTarget(600, 456, 'Task 2: YELLOW + OFF -> -45°', 0xffff44, 'task2-yellow-sensor', false)

		// Task 3: 复杂组合
		this.createTarget(800, 288, 'Task 3: Complex Logic', 0x44ff44, 'task3-complex', false)

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

		// 更新传感器状态
		const sensorState = this.world.resources.sensorState
		this.sensorStatusText.setText(`Sensor: ${sensorState ? 'ON' : 'OFF'}`)
		this.sensorStatusText.setColor(sensorState ? '#00ff00' : '#ff6666')

		// 检测目标销毁
		this.targets.forEach((target) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				if (target.taskId === 'task1-red-sensor') {
					this.completeObjectiveById('task1-red-sensor')
					this.unlockTask2()
					this.cameras.main.flash(200, 255, 0, 0)
				} else if (target.taskId === 'task2-yellow-sensor') {
					this.completeObjectiveById('task2-yellow-sensor')
					this.unlockTask3()
					this.cameras.main.flash(200, 255, 255, 0)
				} else if (target.taskId === 'task3-complex') {
					this.completeObjectiveById('task3-complex')
					this.stopSensorToggle()
					this.cameras.main.flash(200, 0, 255, 0)
				}
			}
		})
	}

	private unlockTask2() {
		if (this.task2Unlocked) return
		this.task2Unlocked = true

		const task2Target = this.targets.find(t => t.taskId === 'task2-yellow-sensor')
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

		const task3Target = this.targets.find(t => t.taskId === 'task3-complex')
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

	private stopSensorToggle() {
		if (this.sensorToggleTimer) {
			this.sensorToggleTimer.destroy()
			this.sensorToggleTimer = null
		}
	}

	private shootAndCastSpell() {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		this.spawnFireball(playerBody.x + 20, playerBody.y, 1, 0)

		// 提示绑定
        console.log('[Level14] Fireball spawned. Ensure you have bound a spell to "onKeyPressed: 1"!')
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
