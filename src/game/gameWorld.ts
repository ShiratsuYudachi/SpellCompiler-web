import { addEntity, createWorld, removeEntity, type World } from 'bitecs'
import Phaser from 'phaser'
import type { GameResources } from './resources'
import { createPlayer } from './prefabs/createPlayer'
import { createEnemy } from './prefabs/createEnemy'
import { createHud } from './prefabs/createHud'
import { enemyAISystem } from './systems/enemyAISystem'
import { fireballSystem } from './systems/fireballSystem'
import { velocitySystem } from './systems/velocitySystem'
import { deathSystem } from './systems/deathSystem'
import { hudSystem } from './systems/hudSystem'

export type GameWorld = World & {
	resources: GameResources
}

export function createGameWorld(
	scene: Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
	playerX?: number,
	playerY?: number,
	createEnemies: boolean = true,
) {
	const world = createWorld() as GameWorld

	const bodies = new Map<number, Phaser.Physics.Arcade.Image>()
	const spellMessageByEid = new Map<number, string>()

	const playerEid = createPlayer(world, scene, bodies, playerX, playerY)
	
	// Only create enemies if requested
	if (createEnemies) {
		createEnemy(world, scene, bodies, playerEid)
	}

	const hudText = createHud(scene)

	world.resources = {
		scene,
		bodies,
		playerEid,
		hudText,
		spellMessageByEid,
		// REMOVED: spellByEid - spells are now managed by Event System via spellId
		// REMOVED: input - no longer needed, using Event System
		// REMOVED: triggers - migrated to Event System
		// REMOVED: triggerIdCounter
		// 压力板和感应器状态
		currentPlateColor: 'NONE',
		sensorState: true,
		pressurePlates: [],
		sensors: [],
		// 关卡特定数据
		levelData: {},
		// 墙体碰撞
		walls: [],
	}

	return world
}

export function updateGameWorld(world: GameWorld, dt: number) {
	// REMOVED: playerInputSystem - all player actions now handled by Event System + spells
	// REMOVED: triggerSystem - all triggers migrated to Event System
	enemyAISystem(world)
	fireballSystem(world, dt)
	velocitySystem(world)
	deathSystem(world)
	hudSystem(world)
}

export function despawnEntity(world: GameWorld, eid: number) {
	const body = world.resources.bodies.get(eid)
	if (body) {
		body.destroy()
		world.resources.bodies.delete(eid)
	}
	world.resources.spellMessageByEid.delete(eid)
	removeEntity(world, eid)
}

export function spawnEntity(world: GameWorld) {
	return addEntity(world)
}

// REMOVED: createInput() function
// Input handling now done through inputEventSystem.ts (Event emissions only)


