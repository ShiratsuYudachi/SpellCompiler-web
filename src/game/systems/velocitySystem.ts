import { query } from 'bitecs'
import { Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'

export function velocitySystem(world: GameWorld) {
	for (const eid of query(world, [Sprite, Velocity])) {
		const body = world.resources.bodies.get(eid)
		if (!body) {
			continue
		}
		
		// Handle both PhysicsSprites (have setVelocity) and raw GameObjects with Body
		const anyBody = body as any
		if (typeof anyBody.setVelocity === 'function') {
			anyBody.setVelocity(Velocity.x[eid], Velocity.y[eid])
		} else if (anyBody.body && typeof anyBody.body.setVelocity === 'function') {
			anyBody.body.setVelocity(Velocity.x[eid], Velocity.y[eid])
		}
	}
}


