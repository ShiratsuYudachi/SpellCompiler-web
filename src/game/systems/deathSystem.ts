import { query } from 'bitecs'
import { Enemy, Health } from '../components'
import type { GameWorld } from '../gameWorld'
import { despawnEntity } from '../gameWorld'

export function deathSystem(world: GameWorld) {
	for (const eid of query(world, [Enemy, Health])) {
		if ((Health.current[eid] || 0) <= 0) {
			despawnEntity(world, eid)
		}
	}
}


