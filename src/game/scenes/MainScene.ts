import Phaser from 'phaser'
import { GameEvents } from '../events'
import type { CompiledSpell } from '../spells/types'
import { createGameWorld, updateGameWorld, type GameWorld } from '../gameWorld'
import { queueFireball } from '../systems/playerInputSystem'
import { getPlayerSpawnPosition, getSceneGates, getPlayerSpawnNearGate, type GateConfig } from './sceneConfig'
import { createRectBody } from '../prefabs/createRectBody'

export class MainScene extends Phaser.Scene {
	constructor() {
		super({ key: 'MainScene' })
	}
	private world!: GameWorld
	private gates: Phaser.Physics.Arcade.Image[] = []
	private gateOverlapsSet = false

	private onRegisterSpell = (payload: CompiledSpell) => {
		const playerEid = this.world.resources.playerEid
		this.world.resources.spellByEid.set(playerEid, payload)
		this.world.resources.spellMessageByEid.set(playerEid, 'Spell equipped. Press 1 to cast.')
	}

	init(data?: { playerX?: number; playerY?: number }) {
		// Store spawn position from scene data
		this.data.set('playerSpawnX', data?.playerX)
		this.data.set('playerSpawnY', data?.playerY)
	}

	create() {
		// Reset gate overlap flag when scene is created/restarted
		this.gateOverlapsSet = false
		this.gates = []

		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, 960, 540)

		// Get player spawn position (from scene data or default)
		const spawnX = this.data.get('playerSpawnX') ?? getPlayerSpawnPosition('MainScene').x
		const spawnY = this.data.get('playerSpawnY') ?? getPlayerSpawnPosition('MainScene').y

		this.world = createGameWorld(this, spawnX, spawnY, false)

		// Create gates from configuration
		const gateConfigs = getSceneGates('MainScene')
		this.gates = this.createGates(gateConfigs)

		// Set up collision detection immediately after gates are created
		this.setupGateCollisions()

		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor)
			// Clear editor context restrictions (allow all nodes in MainScene) (defer to avoid React warning)
			setTimeout(() => {
				this.game.events.emit(GameEvents.setEditorContext, { sceneKey: undefined })
			}, 0)
		})

		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (pointer.button !== 0) {
				return
			}
			queueFireball(this.world.resources.playerEid, pointer.worldX, pointer.worldY)
		})

		this.game.events.on(GameEvents.registerSpell, this.onRegisterSpell)
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(GameEvents.registerSpell, this.onRegisterSpell)
		})
	}

	update() {
		updateGameWorld(this.world, this.game.loop.delta / 1000)
	}

	private setupGateCollisions() {
		if (this.gateOverlapsSet || this.gates.length === 0) {
			return
		}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) {
			// Retry in next frame if player body is not ready
			this.time.delayedCall(0, () => this.setupGateCollisions())
			return
		}

		this.gates.forEach((gate, index) => {
			const gateConfig = getSceneGates('MainScene')[index]
			if (gateConfig) {
				this.physics.add.overlap(playerBody, gate, () => {
					// Get spawn position near the target gate in the target scene
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
			// Use unique texture key for each gate to avoid conflicts
			const textureKey = `gate-${this.scene.key}-${index}`
			const gate = createRectBody(this, textureKey, config.color, config.width, config.height, config.x, config.y, 1)
			gate.setImmovable(true)
			gate.setTint(config.color)

			// Add text label above the gate
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

