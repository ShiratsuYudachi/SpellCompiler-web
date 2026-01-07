import { addComponent } from 'bitecs'
import type Phaser from 'phaser'
import { Direction, Fireball, FireballStats, Lifetime, Owner, Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'
import { spawnEntity } from '../gameWorld'

function ensureFireballTexture(scene: Phaser.Scene) {
	const key = 'fireball'
	if (scene.textures.exists(key)) {
		return key
	}

	const g = scene.add.graphics()
	g.fillStyle(0xffaa33, 1)
	g.fillCircle(6, 6, 6)
	g.generateTexture(key, 12, 12)
	g.destroy()
	return key
}

export function spawnFireball(
	world: GameWorld,
	scene: Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
	bodies: Map<number, Phaser.Physics.Arcade.Image>,
	ownerEid: number,
	x: number,
	y: number,
	dirX: number,
	dirY: number,
) {
	const key = ensureFireballTexture(scene)
	const body = scene.physics.add.image(x, y, key)
	body.setDepth(20)

	const eid = spawnEntity(world)
	bodies.set(eid, body)

	addComponent(world, eid, Sprite)
	addComponent(world, eid, Fireball)
	addComponent(world, eid, Velocity)
	addComponent(world, eid, Owner)
	addComponent(world, eid, Direction)
	addComponent(world, eid, FireballStats)
	addComponent(world, eid, Lifetime)

	Owner.eid[eid] = ownerEid

	Direction.x[eid] = dirX
	Direction.y[eid] = dirY

	FireballStats.speed[eid] = 420
	FireballStats.damage[eid] = 10
	FireballStats.hitRadius[eid] = 16

	// Deflection system initialization
	FireballStats.initialX[eid] = x
	FireballStats.initialY[eid] = y
	FireballStats.pendingDeflection[eid] = 0
	FireballStats.deflectAtTime[eid] = 0

	Lifetime.bornAt[eid] = Date.now()
	Lifetime.lifetimeMs[eid] = 1500

	Velocity.x[eid] = dirX * FireballStats.speed[eid]
	Velocity.y[eid] = dirY * FireballStats.speed[eid]

	return eid
}


