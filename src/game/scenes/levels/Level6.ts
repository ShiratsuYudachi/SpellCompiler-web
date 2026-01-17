import { BaseScene } from '../base/BaseScene'
import { addComponent } from 'bitecs'
import { spawnEntity } from '../../gameWorld'
import { Enemy, EnemyAI, Health, Sprite, Velocity } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'

/**
 * Level 6 - Trigger Mastery
 * Learn to use onTrigger spells to automatically respond to game events
 */
export class Level6 extends BaseScene {
	private enemies: number[] = []

	constructor() {
		super({ key: 'Level6' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Trigger Mastery】\n' +
			'Learn to use onTrigger spells!\n\n' +
			'Press TAB to open editor.\n' +
			'Press 1 to register a trigger spell.\n\n' +
			'Trigger types:\n' +
			'- onEnemyNearby(distance): Auto-trigger when enemy is nearby\n' +
			'- onTimeInterval(ms): Auto-trigger every X milliseconds\n' +
			'- onPlayerHurt(): Auto-trigger when player takes damage\n' +
			'- onPlayerLowHealth(threshold): Auto-trigger when health < threshold\n' +
			'- onEnemyKilled(): Auto-trigger when enemy is killed'
		)

		// Create test enemies
		this.createTestEnemies()

		// Set camera to follow player
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		// Level-specific update logic can be added here
	}

	/**
	 * Create test enemies
	 */
	private createTestEnemies(): void {
		const playerEid = this.world.resources.playerEid
		const spawnPositions = [
			{ x: 400, y: 200 },
			{ x: 600, y: 300 },
			{ x: 800, y: 200 },
		]

		spawnPositions.forEach((pos, index) => {
			const enemyEid = this.createEnemy(pos.x, pos.y, playerEid)
			this.enemies.push(enemyEid)

			// Add label
			const labelText = index === 0 ? 'Test Enemy 1' : index === 1 ? 'Test Enemy 2' : 'Test Enemy 3'
			this.add.text(pos.x, pos.y - 40, labelText, {
				fontSize: '14px',
				color: '#ff6666',
				stroke: '#000000',
				strokeThickness: 2,
			}).setOrigin(0.5)
		})
	}

	/**
	 * Create enemy entity
	 */
	private createEnemy(x: number, y: number, targetEid: number): number {
		const body = createRectBody(this, 'enemy', 0xff4444, 32, 32, x, y, 4)
		body.setCollideWorldBounds(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Velocity)
		addComponent(this.world, eid, Health)
		addComponent(this.world, eid, EnemyAI)

		Velocity.x[eid] = 0
		Velocity.y[eid] = 0

		Health.max[eid] = 30
		Health.current[eid] = 30

		EnemyAI.targetEid[eid] = targetEid
		EnemyAI.speed[eid] = 100
		EnemyAI.engageRange[eid] = 50
		EnemyAI.attackRadius[eid] = 40
		EnemyAI.attackDamage[eid] = 5
		EnemyAI.cooldownMs[eid] = 1500
		EnemyAI.nextAt[eid] = 0

		return eid
	}
}
