import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'

export class Level1 extends BaseScene {
	private bossEid: number | null = null
	private bossDefeated = false
	private bossCoordText!: Phaser.GameObjects.Text
	private teleportTargets: Array<{
		x: number
		y: number
		marker: Phaser.GameObjects.Arc
		collected: boolean
		collector: Phaser.Physics.Arcade.Image
	}> = []

	constructor() {
		super({ key: 'Level1' })
	}

	protected onLevelCreate(): void {
		// 教程提示
		this.showInstruction('【逻辑之门】\n常规移动已失效。按 TAB 打开代码编辑器，通过改写坐标来移动。')

		// 创建 Boss
		this.createBoss()

		// 创建传送点（初始隐藏）
		this.createTeleportTargets()
		this.setTeleportTargetsVisible(false)

		// 相机设置
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// 逻辑锁：未完成所有任务前禁止手动速度
		if (!this.bossDefeated || this.getCollectedCount() < 3) {
			if (playerBody) playerBody.setVelocity(0, 0)
			Velocity.x[playerEid] = 0
			Velocity.y[playerEid] = 0
		}

		// Boss逻辑
		if (this.bossEid !== null && !this.bossDefeated) {
			this.updateBossCoordinates()
			if (Health.current[this.bossEid] <= 0) {
				this.onBossDefeated()
			}
		}
	}

	private createBoss() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const bossX = playerBody.x + 400
		const bossY = playerBody.y

		const bossBody = createRectBody(this, 'boss', 0xff0000, 64, 64, bossX, bossY, 5)
		bossBody.setImmovable(true)

		this.bossEid = spawnEntity(this.world)
		this.world.resources.bodies.set(this.bossEid, bossBody)
		addComponent(this.world, this.bossEid, Health)
		Health.current[this.bossEid] = 100

		this.bossCoordText = this.add
			.text(bossX, bossY + 50, '', { fontSize: '14px', color: '#ff0000' })
			.setOrigin(0.5)
	}

	private onBossDefeated() {
		this.bossDefeated = true
		this.bossCoordText.destroy()

		// 完成任务1：击败Boss
		this.completeObjectiveById('defeat-boss')

		// 显示传送点
		this.setTeleportTargetsVisible(true)
	}

	private createTeleportTargets() {
		const locs = [
			{ x: 800, y: 300 },
			{ x: 1200, y: 800 },
			{ x: 500, y: 1200 },
		]

		locs.forEach((loc) => {
			const marker = this.add.circle(loc.x, loc.y, 30, 0x00ffff, 0.4).setStrokeStyle(2, 0x00ffff)
			const collector = this.physics.add.image(loc.x, loc.y, '').setVisible(false).setSize(60, 60)

			this.physics.add.overlap(
				this.world.resources.bodies.get(this.world.resources.playerEid)!,
				collector,
				() => {
					const target = this.teleportTargets.find((t) => t.collector === collector)
					if (target && !target.collected) {
						target.collected = true
						target.marker.setFillStyle(0x00ff00, 0.6)

						// 更新进度
						const count = this.getCollectedCount()
						this.updateObjectiveDescription('collect-markers', `Collect 3 markers (${count}/3)`)

						// 检查是否全部收集
						if (count === 3) {
							this.completeObjectiveById('collect-markers')
						}
					}
				}
			)

			this.teleportTargets.push({ ...loc, marker, collector, collected: false })
		})
	}

	private getCollectedCount() {
		return this.teleportTargets.filter((t) => t.collected).length
	}

	private setTeleportTargetsVisible(v: boolean) {
		this.teleportTargets.forEach((t) => t.marker.setVisible(v))
	}

	private updateBossCoordinates() {
		const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const boss = this.world.resources.bodies.get(this.bossEid!)!
		const dx = Math.round(boss.x - player.x)
		const dy = Math.round(boss.y - player.y)
		this.bossCoordText.setText(`Boss dx: ${dx} dy: ${dy}`).setPosition(boss.x, boss.y + 60)
	}
}
