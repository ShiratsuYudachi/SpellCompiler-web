import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite, Enemy, Fireball, Owner, Direction, FireballStats, Lifetime } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'
import type Phaser from 'phaser'
import { createRoom } from '../../utils/levelUtils'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level18Meta: LevelMeta = {
	key: 'Level18',
	playerSpawnX: 120,
	playerSpawnY: 400,
	tileSize: 64,
	mapData: createRoom(15, 9),
	objectives: [
		{
			id: 'task1-combined',
			description: 'Task 1: Use combined conditions (age>300ms AND distance>200px) to deflect',
			type: 'defeat',
		},
		{
			id: 'task2-lshape',
			description: 'Task 2: Hit L-shape target with double deflection (90° twice)',
			type: 'defeat',
			prerequisite: 'task1-combined',
		},
		{
			id: 'task3-boomerang',
			description: 'Task 3: Create boomerang effect with 180° deflection',
			type: 'defeat',
			prerequisite: 'task2-lshape',
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
			{ id: 'lit-angle', type: 'literal', position: { x: 100, y: 200 }, data: { value: 90 } },
			{ id: 'lit-delay', type: 'literal', position: { x: 100, y: 280 }, data: { value: 2000 } },
		],
		edges: [
			{ id: 'e1', source: 'func-deflect', target: 'output-1', targetHandle: 'value' },
			{ id: 'e2', source: 'lit-angle', target: 'func-deflect', targetHandle: 'arg0' },
			{ id: 'e3', source: 'lit-delay', target: 'func-deflect', targetHandle: 'arg1' },
		],
	},
}

levelRegistry.register(Level18Meta)

export class Level18 extends BaseScene {
	private targets: Array<{
		eid: number
		marker: Phaser.GameObjects.Arc
		label: Phaser.GameObjects.Text
		destroyed: boolean
	}> = []

	constructor() {
		super({ key: 'Level18' })
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
		this.spawnLevel18Fireball(playerBody.x, playerBody.y, 1, 0) // dirX=1 (right), dirY=0

		// 2. Cast spell immediately (using event system logic if possible, or direct cast if needed for this specific level)
		// For Level 18, we might want to trigger a specific event instead of direct cast
        // BUT, since we removed spellByEid, we need to use the Event System to trigger spells.
        // Let's emit a custom event that the player can bind to.
        // Or, if this is a legacy level behavior, we might need to rethink how it works.
        // For now, let's assume the player has bound 'onKeyPressed' to a spell.
        // If we want to force a cast, we can emit an event.
        
        // Emulating old behavior: trigger 'onKeyPressed' for key '1'
        // This relies on the player having bound a spell to '1' via the Event System.
        // If they haven't, nothing happens (which is correct for the new system).
        // Alternatively, we can emit a custom event 'level18_shoot' and ask player to bind to it.
        
        // Since we removed spellByEid, we can't get the spell directly.
        // We rely on the Event System to handle the key press '1'.
        // The input system should already handle this if we set it up correctly.
        // However, this method `shootAndCastSpell` is called by a manual key listener in `onLevelCreate`.
        
        // If we want to maintain the "press 1 to shoot AND cast" behavior without binding:
        // We can't. The philosophy has changed.
        // The player MUST bind a spell to an event.
        
        // So, we should probably remove this manual key listener and let the Event System handle '1'.
        // BUT, Level 18 has specific logic to spawn a fireball THEN cast.
        
        // Temporary fix: Emit a custom event that the player *could* bind to, 
        // or just rely on standard input events.
        
        // Actually, the instruction says "Press 1 to shoot fireball and cast spell".
        // This implies a hardcoded behavior in the level.
        // If we want to keep this hardcoded behavior, we need a way to get the "equipped" spell.
        // But "equipped spell" concept is gone.
        
        // Solution: The level should probably just spawn the fireball on '1', 
        // and let the player bind a spell to 'onKeyPressed: 1' if they want magic.
        // OR, we emit a 'onFireballSpawned' event?
        
        // Let's just log for now, as we can't cast a specific spell without an ID.
		console.log('[Level18] Fireball spawned. Bind a spell to "onKeyPressed: 1" to add magic!')
	}

	private spawnLevel18Fireball(x: number, y: number, dirX: number, dirY: number) {
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
		// Plate-based deflection
		FireballStats.deflectOnPlateColor[eid] = 0
		FireballStats.deflectOnPlateAngle[eid] = 0
		FireballStats.plateDeflected[eid] = 0

		// Extended lifetime for Level18 (5 seconds)
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
