import Phaser from 'phaser'
import { GameEvents } from '../events'
import { Entity } from '../core/Entity'
import { HealthComponent } from '../components/HealthComponent'
import { EnemyAIComponent } from '../components/EnemyAIComponent'
import { createPlayer } from '../entities/createPlayer'
import { createEnemy } from '../entities/createEnemy'
import type { CompiledSpell } from '../spells/types'
import { PlayerSpellManagerComponent } from '../components/PlayerSpellManagerComponent'

export class MainScene extends Phaser.Scene {
	private entities: Entity[] = []
	private player!: Entity
	private enemy!: Entity
	private hudText!: Phaser.GameObjects.Text
	private lastSpellMessage = ''

	private onRegisterSpell = (payload: CompiledSpell) => {
		const mgr = this.player.get(PlayerSpellManagerComponent)
		if (!mgr) {
			this.lastSpellMessage = 'PlayerSpellManagerComponent not found.'
			return
		}
		mgr.setSpell(payload)
	}
	
	getEntities() {
		return this.entities
	}

	create() {
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, 960, 540)

		this.player = createPlayer(this)
		this.enemy = createEnemy(this)

		this.enemy
			.add(new EnemyAIComponent(this, this.enemy, this.player))

		this.entities.push(this.player, this.enemy)

		this.hudText = this.add.text(16, 16, '', {
			fontFamily: 'monospace',
			fontSize: '16px',
			color: '#ffffff',
		})
		this.hudText.setDepth(100)
		this.hudText.setScrollFactor(0)

		this.input.keyboard?.on('keydown-TAB', (e: KeyboardEvent) => {
			e.preventDefault()
			this.game.events.emit(GameEvents.toggleEditor)
		})

		this.game.events.on(GameEvents.registerSpell, this.onRegisterSpell)
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.off(GameEvents.registerSpell, this.onRegisterSpell)
		})
	}

	update() {
		const enemyHealth = this.enemy.get(HealthComponent)
		if (enemyHealth && enemyHealth.isDead()) {
			this.enemy.destroy()
		}

		for (const e of this.entities) {
			e.update(this.game.loop.delta / 1000)
		}
		this.entities = this.entities.filter((e) => e.isActive())

		const playerHealth = this.player.get(HealthComponent)
		const spellManager = this.player.get(PlayerSpellManagerComponent)
		const spellMessage = spellManager?.lastMessage || this.lastSpellMessage
		this.hudText.setText(
			[
				`HP: ${playerHealth ? playerHealth.current : 0}/${playerHealth ? playerHealth.max : 0}`,
				'WASD / Arrows to move',
				'Space to melee (1s CD)',
				'Left click to fireball (0.3s CD)',
				'1 to cast loaded spell',
				'Tab to toggle Editor',
				spellMessage,
			].join('\n'),
		)
	}
}

