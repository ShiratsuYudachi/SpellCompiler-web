import Phaser from 'phaser'
import { createEnemy } from '../game/prefabs/createEnemy'
import { createGameWorld } from '../game/gameWorld'

export class DebugScene extends Phaser.Scene {
	private world: any

	constructor() {
		super('DebugScene')
	}

	preload() {
        console.log('[DebugScene] Preloading enemy asset...')
		this.load.image('enemy', (import.meta.env.BASE_URL || '/') + 'assets/enemy.png')
	}

	create() {
        console.log('[DebugScene] Creating...')
		const bodies = new Map<number, Phaser.Physics.Arcade.Image>()
		
		// Create a minimal world structure that createEnemy expects
		this.world = {
			resources: {
				scene: this,
				bodies: bodies,
				playerEid: 0,
			}
		}
		
		// Dummy spawn entity function mock
		let eidCounter = 1;
		(this.world as any).addEntity = () => eidCounter++;
		
		// Wait, createEnemy uses bitecs. We might need a real world.
		const realWorld = createGameWorld(
            this as any,
            400,
            300,
            false // don't auto-create enemies
        )
        
        console.log('[DebugScene] Spawning enemy...')
		createEnemy(realWorld, this as any, realWorld.resources.bodies, realWorld.resources.playerEid, 480, 270)
	}

	update() {
		// nothing
	}
}
