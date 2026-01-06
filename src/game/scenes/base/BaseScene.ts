import Phaser from 'phaser'
import { GameEvents } from '../../events'
import type { CompiledSpell } from '../../spells/types'
import { createGameWorld, updateGameWorld, type GameWorld } from '../../gameWorld'
import { queueFireball } from '../../systems/playerInputSystem'
import { getPlayerSpawnPosition, getSceneGates, getPlayerSpawnNearGate, type GateConfig } from '../sceneConfig'
import { createRectBody } from '../../prefabs/createRectBody'

/**
 * BaseScene - 所有关卡的基类
 * 统一处理：世界创建、gate系统、编辑器切换、spell注册
 */
export abstract class BaseScene extends Phaser.Scene {
	protected world!: GameWorld
	protected gates: Phaser.Physics.Arcade.Image[] = []
	protected gateOverlapsSet = false

	private onRegisterSpell = (payload: CompiledSpell) => {
		const playerEid = this.world.resources.playerEid
		this.world.resources.spellByEid.set(playerEid, payload)
		this.world.resources.spellMessageByEid.set(playerEid, 'Spell equipped. Press 1 to cast.')
	}

	init(data?: { playerX?: number; playerY?: number }) {
		this.data.set('playerSpawnX', data?.playerX)
		this.data.set('playerSpawnY', data?.playerY)
	}

	create() {
		this.gateOverlapsSet = false
		this.gates = []

		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, 960, 540)

		const spawnX = this.data.get('playerSpawnX') ?? getPlayerSpawnPosition(this.scene.key).x
		const spawnY = this.data.get('playerSpawnY') ?? getPlayerSpawnPosition(this.scene.key).y

		this.world = createGameWorld(this, spawnX, spawnY, false)

		// 创建gate
		const gateConfigs = getSceneGates(this.scene.key)
		this.gates = this.createGates(gateConfigs)
		this.setupGateCollisions()

		// 编辑器切换
		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor)
			setTimeout(() => {
				this.game.events.emit(GameEvents.setEditorContext, { sceneKey: undefined })
			}, 0)
		})

		// // 点击施法
		// this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		// 	if (pointer.button !== 0) return
		// 	queueFireball(this.world.resources.playerEid, pointer.worldX, pointer.worldY)
		// })

		this.game.events.on(GameEvents.registerSpell, this.onRegisterSpell)
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(GameEvents.registerSpell, this.onRegisterSpell)
		})

		// 子类扩展点
		this.onLevelCreate()
	}

	update() {
		updateGameWorld(this.world, this.game.loop.delta / 1000)
		this.onLevelUpdate()
	}

	// 子类可重写的扩展点
	protected onLevelCreate() {}
	protected onLevelUpdate() {}

	private setupGateCollisions() {
		if (this.gateOverlapsSet || this.gates.length === 0) return

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			this.time.delayedCall(0, () => this.setupGateCollisions())
			return
		}

		this.gates.forEach((gate, index) => {
			const gateConfig = getSceneGates(this.scene.key)[index]
			if (gateConfig) {
				this.physics.add.overlap(playerBody, gate, () => {
					const targetSpawn = getPlayerSpawnNearGate(gateConfig.targetScene, 0)
					this.scene.start(gateConfig.targetScene, {
						playerX: targetSpawn.x,
						playerY: targetSpawn.y,
					})
				})
			}
		})

		this.gateOverlapsSet = true
	}

	private createGates(gateConfigs: GateConfig[]): Phaser.Physics.Arcade.Image[] {
		const gates: Phaser.Physics.Arcade.Image[] = []

		gateConfigs.forEach((config, index) => {
			const textureKey = `gate-${this.scene.key}-${index}`
			const gate = createRectBody(this, textureKey, config.color, config.width, config.height, config.x, config.y, 1)
			gate.setImmovable(true)
			gate.setTint(config.color)

			const gateText = this.add.text(config.x, config.y - 70, config.label, {
				fontSize: '16px',
				color: '#ffffff',
				align: 'center',
			})
			gateText.setOrigin(0.5, 0.5)

			gates.push(gate)
		})

		return gates
	}
}
