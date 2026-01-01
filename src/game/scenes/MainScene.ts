import Phaser from 'phaser'
import { GameEvents } from '../events'
import type { CompiledSpell } from '../spells/types'
import { createGameWorld, updateGameWorld, type GameWorld } from '../world'
import { queueFireball } from '../systems/playerInputSystem'

export class MainScene extends Phaser.Scene {
	private world!: GameWorld

	private onRegisterSpell = (payload: CompiledSpell) => {
		const playerEid = this.world.resources.playerEid
		this.world.resources.spellByEid.set(playerEid, payload)
		this.world.resources.spellMessageByEid.set(playerEid, 'Spell equipped. Press 1 to cast.')
	}

	create() {
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, 960, 540)

		this.world = createGameWorld(this)

		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor)
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
}

