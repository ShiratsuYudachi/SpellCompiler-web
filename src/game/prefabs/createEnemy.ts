import { addComponent } from 'bitecs'
import type Phaser from 'phaser'
import { Enemy, EnemyAI, Health, Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'
import { spawnEntity } from '../gameWorld'
export function createEnemy(
	world: GameWorld,
	scene: Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
	bodies: Map<number, Phaser.Physics.Arcade.Image>,
	targetEid: number,
	x = 740,
	y = 270,
) {
	const textureKeys = ['enemy1', 'enemy2', 'enemy3']
	const randomKey = textureKeys[Math.floor(Math.random() * textureKeys.length)]
	const body = scene.physics.add.image(x, y, randomKey)
	body.setDepth(4)
	body.setDisplaySize(70, 70)
	body.setCollideWorldBounds(true)

	const eid = spawnEntity(world)
	bodies.set(eid, body)

	addComponent(world, eid, Sprite)
	addComponent(world, eid, Enemy)
	addComponent(world, eid, Velocity)
	addComponent(world, eid, Health)
	addComponent(world, eid, EnemyAI)

	Velocity.x[eid] = 0
	Velocity.y[eid] = 0

	Health.max[eid] = 50
	Health.current[eid] = 50

	EnemyAI.targetEid[eid] = targetEid
	EnemyAI.speed[eid] = 140
	EnemyAI.engageRange[eid] = 40
	EnemyAI.attackRadius[eid] = 40
	EnemyAI.attackDamage[eid] = 5
	EnemyAI.cooldownMs[eid] = 1000
	EnemyAI.nextAt[eid] = 0

	return eid
}


