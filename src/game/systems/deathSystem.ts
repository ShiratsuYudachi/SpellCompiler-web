import { query } from 'bitecs'
import { Enemy, Health } from '../components'
import type { GameWorld } from '../gameWorld'
import { despawnEntity } from '../gameWorld'
import { eventQueue } from '../events/EventQueue'

export function deathSystem(world: GameWorld) {
	for (const eid of query(world, [Enemy, Health])) {
		if ((Health.current[eid] || 0) <= 0) {
			// Emit onEnemyKilled event
			const initialState = { type: 'gamestate' as const, __runtimeRef: Symbol('GameState') }
			eventQueue.emit('onEnemyKilled', initialState, eid)

			despawnEntity(world, eid)
		}
	}
}



