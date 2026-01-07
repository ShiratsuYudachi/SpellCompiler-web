import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'
import type Phaser from 'phaser'

export class Level4 extends BaseScene {
	private targets: Array<{
		eid: number
		marker: Phaser.GameObjects.Arc
		label: Phaser.GameObjects.Text
		destroyed: boolean
	}> = []

	constructor() {
		super({ key: 'Level4' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Deflection Proving Grounds】\n' +
			'Master projectile deflection magic.\n' +
			'Press TAB to edit spells.\n' +
			'Press 1 to shoot fireball and cast spell.'
		)

		// Create three static target enemies for the three tasks
		// Player is at (120, 400)
		this.createTarget(600, 350, 'Task 1: Combined Condition', 0xff6600)
		this.createTarget(700, 150, 'Task 2: L-Shape Chain', 0xffaa00)
		this.createTarget(200, 150, 'Task 3: Boomerang', 0xff00ff)

		// Lock player movement
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(120, 400)
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		// Bind key '1' to shoot fireball + cast spell
		this.input.keyboard?.on('keydown-ONE', () => {
			this.shootAndCastSpell()
		})
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// Lock player in place
		if (playerBody) {
			playerBody.setVelocity(0, 0)
		}
		Velocity.x[playerEid] = 0
		Velocity.y[playerEid] = 0

		// Check target destruction
		this.targets.forEach((target, index) => {
			if (!target.destroyed && Health.current[target.eid] <= 0) {
				target.destroyed = true
				target.marker.destroy()
				target.label.destroy()

				// Complete objectives based on which target was destroyed
				if (index === 0) {
					this.completeObjectiveById('task1-combined')
				} else if (index === 1) {
					this.completeObjectiveById('task2-lshape')
				} else if (index === 2) {
					this.completeObjectiveById('task3-boomerang')
				}

				this.cameras.main.flash(200, 0, 255, 0)
			}
		})
	}

	private shootAndCastSpell() {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (!playerBody) return

		// 1. Spawn fireball (fixed direction: right)
		this.spawnLevel4Fireball(playerBody.x, playerBody.y, 1, 0) // dirX=1 (right), dirY=0

		// 2. Cast spell immediately
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				castSpell(this.world, playerEid, spell)
				console.log('[Level4] Spell cast successfully')
			} catch (err) {
				console.error('[Level4] Spell error:', err)
			}
		} else {
			console.warn('[Level4] No spell equipped. Use TAB to create a spell.')
		}
	}

	private spawnLevel4Fireball(x: number, y: number, dirX: number, dirY: number) {
		// Ensure fireball texture exists
		const key = 'fireball'
		if (!this.textures.exists(key)) {
			const g = this.add.graphics()
			g.fillStyle(0xffaa33, 1)
			g.fillCircle(6, 6, 6)
			g.generateTexture(key, 12, 12)
			g.destroy()
		}

		// Create physics body
		const body = this.physics.add.image(x, y, key)
		body.setDepth(20)

		// Create ECS entity
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

		FireballStats.speed[eid] = 420
		FireballStats.damage[eid] = 10
		FireballStats.hitRadius[eid] = 16
		FireballStats.initialX[eid] = x
		FireballStats.initialY[eid] = y
		FireballStats.pendingDeflection[eid] = 0
		FireballStats.deflectAtTime[eid] = 0

		// Extended lifetime for Level4 (5 seconds)
		Lifetime.bornAt[eid] = Date.now()
		Lifetime.lifetimeMs[eid] = 5000

		Velocity.x[eid] = dirX * FireballStats.speed[eid]
		Velocity.y[eid] = dirY * FireballStats.speed[eid]

		return eid
	}

	private createTarget(x: number, y: number, labelText: string, color: number) {
		// Create visual marker
		const marker = this.add.circle(x, y, 20, color, 0.5).setStrokeStyle(3, color)
		const label = this.add.text(x, y - 40, labelText, {
			fontSize: '14px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 3,
		}).setOrigin(0.5)

		// Create enemy entity
		const body = createRectBody(this, 'target', color, 40, 40, x, y, 3)
		body.setImmovable(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = 10
		Health.current[eid] = 10

		this.targets.push({ eid, marker, label, destroyed: false })
	}
}
