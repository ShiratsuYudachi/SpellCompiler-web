import { addComponent } from 'bitecs'
import type Phaser from 'phaser'
import { Health, Player, PlayerControl, Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'
import { spawnEntity } from '../gameWorld'
import { createRectBody } from './createRectBody'

export function createPlayer(
	world: GameWorld,
	scene: Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
	bodies: Map<number, Phaser.Physics.Arcade.Image>,
	x = 200,
	y = 270,
) {
	const body = createRectBody(scene, 'player-rect', 0x4a90e2, 32, 32, x, y, 5)
	body.setCollideWorldBounds(true)

	const eid = spawnEntity(world)
	bodies.set(eid, body)

	addComponent(world, eid, Sprite)
	addComponent(world, eid, Player)
	addComponent(world, eid, Velocity)
	addComponent(world, eid, Health)
	addComponent(world, eid, PlayerControl)

	Velocity.x[eid] = 0
	Velocity.y[eid] = 0

	Health.max[eid] = 100
	Health.current[eid] = 100

	PlayerControl.moveSpeed[eid] = 220

	PlayerControl.meleeRadius[eid] = 70
	PlayerControl.meleeDamage[eid] = 15
	PlayerControl.meleeCooldownMs[eid] = 1000
	PlayerControl.nextMeleeAt[eid] = 0

	PlayerControl.fireballCooldownMs[eid] = 300
	PlayerControl.nextFireballAt[eid] = 0
	PlayerControl.fireballQueued[eid] = 0
	PlayerControl.fireballTargetX[eid] = 0
	PlayerControl.fireballTargetY[eid] = 0

	return eid
}


