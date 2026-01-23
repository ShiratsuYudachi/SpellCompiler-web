/**
 * Game World Test Framework
 * 
 * Provides utilities to create real game worlds and test spells in them.
 * This framework creates actual game worlds without Phaser dependency for testing.
 */

import { createWorld, addEntity } from 'bitecs'
import type { GameWorld } from '../../game/gameWorld'
import { Velocity, Direction } from '../../game/components/motion'
import { Health } from '../../game/components/health'
import { Player } from '../../game/components/tags'
import type { CompiledSpell } from '../../game/spells/types'
import { castSpell } from '../../game/spells/castSpell'

/**
 * Mock physics body for testing
 */
interface MockPhysicsBody {
	x: number
	y: number
	setVelocity: (vx: number, vy: number) => void
}

/**
 * Test world configuration
 */
export interface TestWorldConfig {
	playerX?: number
	playerY?: number
	createEnemies?: boolean
}

/**
 * Test world instance with helper methods
 */
export class TestGameWorld {
	public world: GameWorld
	public playerEid: number
	private mockScene: any

	constructor(config: TestWorldConfig = {}) {
		const {
			playerX = 100,
			playerY = 100,
			createEnemies = false
		} = config

		// Create mock scene (minimal implementation)
		this.mockScene = {
			physics: {
				add: {
					image: (x: number, y: number) => ({
						x, y,
						setVelocity: () => {},
						setDepth: () => {},
						setDisplaySize: () => {},
						setTint: () => {},
						destroy: () => {},
					})
				}
			},
			add: {
				text: () => ({
					setOrigin: () => {},
					setScrollFactor: () => {},
					setDepth: () => {},
				})
			},
			time: {
				addEvent: () => {}
			}
		}

		// Create ECS world
		this.world = createWorld() as GameWorld
		this.world.resources = {
			scene: this.mockScene,
			bodies: new Map(),
			playerEid: 0,
			hudText: null as any,
			spellByEid: new Map(),
			spellMessageByEid: new Map(),
			input: null as any,
			triggers: new Map(),
			triggerIdCounter: 0,
			currentPlateColor: 'NONE',
			sensorState: true,
			pressurePlates: [],
			sensors: [],
			levelData: {},
			walls: []
		}

		// Create player entity
		this.playerEid = this.createPlayer(playerX, playerY)
		this.world.resources.playerEid = this.playerEid

		// Create enemies if requested
		if (createEnemies) {
			this.createEnemy(200, 200)
		}
	}

	/**
	 * Create a player entity at specified position
	 */
	private createPlayer(x: number, y: number): number {
		const eid = addEntity(this.world)
		
		// Add components
		Velocity.x[eid] = 0
		Velocity.y[eid] = 0
		
		Direction.x[eid] = 1
		Direction.y[eid] = 0
		
		// @ts-ignore - Health component uses bitECS pattern
		Health.current[eid] = 100
		// @ts-ignore
		Health.max[eid] = 100
		
		// @ts-ignore - Player tag
		Player[eid] = 1

		// Create mock physics body
		const mockBody: MockPhysicsBody = {
			x,
			y,
			setVelocity: (vx: number, vy: number) => {
				Velocity.x[eid] = vx
				Velocity.y[eid] = vy
			}
		}

		this.world.resources.bodies.set(eid, mockBody as any)

		return eid
	}

	/**
	 * Create an enemy entity at specified position
	 */
	private createEnemy(x: number, y: number): number {
		const eid = addEntity(this.world)
		
		Velocity.x[eid] = 0
		Velocity.y[eid] = 0
		
		Direction.x[eid] = 1
		Direction.y[eid] = 0
		
		// @ts-ignore - Health component
		Health.current[eid] = 50
		// @ts-ignore
		Health.max[eid] = 50

		const mockBody: MockPhysicsBody = {
			x,
			y,
			setVelocity: (vx: number, vy: number) => {
				Velocity.x[eid] = vx
				Velocity.y[eid] = vy
			}
		}

		this.world.resources.bodies.set(eid, mockBody as any)

		return eid
	}

	/**
	 * Execute a compiled spell
	 */
	castSpell(spell: CompiledSpell, casterEid?: number): any {
		return castSpell(this.world, casterEid ?? this.playerEid, spell)
	}

	/**
	 * Get player position
	 */
	getPlayerPosition(): { x: number; y: number } {
		const body = this.world.resources.bodies.get(this.playerEid)
		if (!body) {
			throw new Error('Player body not found')
		}
		return {
			x: body.x,
			y: body.y
		}
	}

	/**
	 * Get entity position
	 */
	getEntityPosition(eid: number): { x: number; y: number } {
		const body = this.world.resources.bodies.get(eid)
		if (!body) {
			throw new Error(`Entity ${eid} body not found`)
		}
		return {
			x: body.x,
			y: body.y
		}
	}

	/**
	 * Get entity health
	 */
	getEntityHealth(eid: number): { current: number; max: number } {
		return {
			// @ts-ignore
			current: Health.current[eid],
			// @ts-ignore
			max: Health.max[eid]
		}
	}

	/**
	 * Count entities in the world
	 */
	countEntities(): number {
		return this.world.resources.bodies.size
	}

	/**
	 * Clean up resources
	 */
	destroy(): void {
		// Cleanup if needed
		this.world.resources.bodies.clear()
	}
}

/**
 * Helper to create a test world for a single test
 */
export function createTestWorld(config?: TestWorldConfig): TestGameWorld {
	return new TestGameWorld(config)
}
