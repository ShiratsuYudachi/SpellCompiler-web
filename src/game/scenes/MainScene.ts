import Phaser from 'phaser'
import { GameEvents } from '../events'
import { InputSystem } from '../core/InputSystem'
import { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'
import { PlayerAttackComponent } from '../components/PlayerAttackComponent'
import { createPlayer } from '../entities/createPlayer'
import { createEnemy } from '../entities/createEnemy'

export class MainScene extends Phaser.Scene {
	private inputSystem!: InputSystem
	private entities: Entity[] = []
	private player!: Entity
	private enemy!: Entity
	private hudText!: Phaser.GameObjects.Text

	create() {
		this.cameras.main.setBackgroundColor('#1b1f2a')
		this.physics.world.setBounds(0, 0, 960, 540)

		this.inputSystem = new InputSystem(this)

		this.player = createPlayer(this, this.inputSystem)
		this.enemy = createEnemy(this, this.player)
		this.player.add(
			new PlayerAttackComponent(this, this.inputSystem, this.player.get(SpriteComponent)!, this.enemy, 70, 15),
		)

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
	}

	update() {
		const enemyHealth = this.enemy.get(HealthComponent)
		if (enemyHealth && enemyHealth.isDead()) {
			this.enemy.destroy()
			this.entities = this.entities.filter((e) => e.isActive())
		}

		for (const e of this.entities) {
			e.update(this.game.loop.delta / 1000)
		}

		const playerHealth = this.player.get(HealthComponent)
		this.hudText.setText(
			[
				`HP: ${playerHealth ? playerHealth.current : 0}/${playerHealth ? playerHealth.max : 0}`,
				'WASD / Arrows to move',
				'Space to attack',
				'Tab to toggle Editor',
			].join('\n'),
		)
	}
}

