import type { GameWorld } from '../gameWorld';

/**
 * Simple context holder for game functions
 * All game functions access world and casterEid through this manager
 */
export class GameStateManager {
	public world: GameWorld;
	public casterEid: number;
	
	constructor(world: GameWorld, casterEid: number) {
		this.world = world;
		this.casterEid = casterEid;
	}
}
