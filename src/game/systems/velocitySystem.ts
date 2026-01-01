import { query } from 'bitecs'
import { Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'

export function velocitySystem(world: GameWorld) {
	for (const eid of query(world, [Sprite, Velocity])) {
		const body = world.resources.bodies.get(eid)
		if (!body) {
			continue
		}
		body.setVelocity(Velocity.x[eid], Velocity.y[eid])
	}
}


