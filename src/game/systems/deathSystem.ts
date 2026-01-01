import { query } from 'bitecs'
import { Enemy, Health } from '../components'
import type { GameWorld } from '../world'
import { despawnEntity } from '../world'

export function deathSystem(world: GameWorld) {
	for (const eid of query(world, [Enemy, Health])) {
		if ((Health.current[eid] || 0) <= 0) {
			despawnEntity(world, eid)
		}
	}
}


