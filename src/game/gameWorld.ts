import { addEntity, createWorld, removeEntity, type World } from 'bitecs'
import Phaser from 'phaser'
import type { GameResources, InputState } from './resources'
import type { CompiledSpell } from './spells/types'
import { createPlayer } from './prefabs/createPlayer'
import { createEnemy } from './prefabs/createEnemy'
import { createHud } from './prefabs/createHud'
import { playerInputSystem } from './systems/playerInputSystem'
import { enemyAISystem } from './systems/enemyAISystem'
import { fireballSystem } from './systems/fireballSystem'
import { velocitySystem } from './systems/velocitySystem'
import { deathSystem } from './systems/deathSystem'
import { hudSystem } from './systems/hudSystem'
import { triggerSystem } from './systems/triggerSystem'

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

	const input = createInput(scene)
	const bodies = new Map<number, Phaser.Physics.Arcade.Image>()
	const spellByEid = new Map<number, CompiledSpell>()
	const spellMessageByEid = new Map<number, string>()
	const triggers = new Map<number, import('./resources').TriggerConfig>()

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
		spellByEid,
		spellMessageByEid,
		input,
		triggers,
		triggerIdCounter: 0,
		// 压力板和感应器状态
		currentPlateColor: 'NONE',
		sensorState: true,
		pressurePlates: [],
		sensors: [],
	}

	return world
}

export function updateGameWorld(world: GameWorld, dt: number) {
	playerInputSystem(world)
	enemyAISystem(world)
	fireballSystem(world, dt)
	velocitySystem(world)
	deathSystem(world)
	triggerSystem(world) // 检查并执行触发器
	hudSystem(world)
}

export function despawnEntity(world: GameWorld, eid: number) {
	const body = world.resources.bodies.get(eid)
	if (body) {
		body.destroy()
		world.resources.bodies.delete(eid)
	}
	world.resources.spellByEid.delete(eid)
	world.resources.spellMessageByEid.delete(eid)
	removeEntity(world, eid)
}

export function spawnEntity(world: GameWorld) {
	return addEntity(world)
}

function createInput(scene: Phaser.Scene): InputState {
	const cursors = scene.input.keyboard!.createCursorKeys()
	const keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
	const meleeKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
	const spellKey1 = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE)

	return {
		cursors,
		keys,
		meleeKey,
		spellKey1,
	}
}


