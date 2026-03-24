import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue, GameState } from '../ast/ast';
import { query } from 'bitecs';
import { GameStateManager } from '../../game/state/GameStateManager';
import { Health, Enemy } from '../../game/components';
import { spawnFireball } from '../../game/prefabs/spawnFireball';
import { eventQueue } from '../../game/events/EventQueue';
import { playTeleport, playFireballCast, playDamageHit } from '../../game/SpellVisual/SpellVisualManager';

// Global state manager reference
let globalStateManager: GameStateManager | null = null;

export function setGameStateManager(manager: GameStateManager) {
	globalStateManager = manager;
}

function getManager(): GameStateManager {
	if (!globalStateManager) {
		throw new Error('GameStateManager not initialized - call setGameStateManager first');
	}
	return globalStateManager;
}

function assertGameState(value: Value): asserts value is GameState {
	if (typeof value !== 'object' || !value || value.type !== 'gamestate') {
		throw new Error('Expected GameState');
	}
}

/**
 * Register all game-related functions
 * These functions use GameState to make them appear pure
 */
export function registerGameFunctions(evaluator: Evaluator) {
	
	// ===================================
	// Query Spells - Read from GameState
	// ===================================

	// game::getPlayer(state: GameState) -> Entity
	evaluator.registerFunction({
		fullName: 'game::getPlayer',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			// Return player entity ID as number
			return manager.world.resources.playerEid;
		},
		ui: { displayName: '👤 getPlayer' }
	});

	// game::getEntityPosition(state: GameState, entity: Entity) -> Vector2D
	evaluator.registerFunction({
		fullName: 'game::getEntityPosition',
		params: ['state', 'entity'],
		fn: (state: Value, entity: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			
			if (typeof entity !== 'number') {
				throw new Error('Entity must be a number');
			}
			
			const body = manager.world.resources.bodies.get(entity);
			if (!body) {
				throw new Error(`Entity ${entity} has no body`);
			}
			
			// Return Vector2D as a function
			return evaluator.callFunction('vec::create', body.x, body.y);
		},
		ui: { displayName: '📍 getEntityPosition' }
	});

	// game::getNearbyEnemies(state: GameState, position: Vector2D, radius: number) -> List<Entity>
	evaluator.registerFunction({
		fullName: 'game::getNearbyEnemies',
		params: ['state', 'position', 'radius'],
		fn: (state: Value, position: Value, radius: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			
			if (typeof radius !== 'number') {
				throw new Error('Radius must be a number');
			}
			
			// Extract position from Vector2D
			const posX = evaluator.callFunctionValue(position as FunctionValue, 'x') as number;
			const posY = evaluator.callFunctionValue(position as FunctionValue, 'y') as number;
			
			// Query all entities except caster
			const nearbyEnemies: number[] = [];
			const bodies = manager.world.resources.bodies;
			
			for (const [eid, body] of bodies.entries()) {
				if (eid === manager.casterEid) continue;
				
				const dx = body.x - posX;
				const dy = body.y - posY;
				const dist = Math.sqrt(dx * dx + dy * dy);
				
				if (dist <= radius) {
					nearbyEnemies.push(eid);
				}
			}
			
			// Convert to functional list using fromArray helper
			return evaluator.callFunction('list::fromArray', nearbyEnemies as any);
		},
		ui: { displayName: '👾 getNearbyEnemies' }
	});

	// game::getAllBullets(state: GameState) -> List<Entity>
	// Returns all bullet entities in the game
	evaluator.registerFunction({
		fullName: 'game::getAllBullets',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			
			// Collect all bullet entities
			// Bullets are entities that are not the player and not enemies
			// In Level 3/4, bullets are spawned by the scene, not by player
			const bullets: number[] = [];
			const bodies = manager.world.resources.bodies;
			const playerEid = manager.world.resources.playerEid;
			
			for (const [eid, _body] of bodies.entries()) {
				// Skip player
				if (eid === playerEid) continue;
				
				// Check if entity is a bullet (has Sprite and Velocity but no Health)
				// This is a simple heuristic - bullets don't have health
				const hasHealth = Health.current[eid] !== undefined;
				if (!hasHealth) {
					bullets.push(eid);
				}
			}
			
			// Convert to functional list
			return evaluator.callFunction('list::fromArray', bullets as any);
		},
		ui: { displayName: '🔴 getAllBullets' }
	});

	// game::isBulletNear(state: GameState, bulletEid: number) -> boolean
	// Returns true if bullet is within 50 units of the player, false otherwise
	evaluator.registerFunction({
		fullName: 'game::isBulletNear',
		params: ['state', 'bulletEid'],
		fn: (state: Value, bulletEid: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			
			if (typeof bulletEid !== 'number') {
				throw new Error('bulletEid must be a number');
			}
			
			const playerEid = manager.world.resources.playerEid;
			const bodies = manager.world.resources.bodies;
			
			// Get player body
			const playerBody = bodies.get(playerEid);
			if (!playerBody) {
				return false;
			}
			
			// Get bullet body
			const bulletBody = bodies.get(bulletEid);
			if (!bulletBody) {
				return false;
			}
			
			// Calculate distance
			const dx = bulletBody.x - playerBody.x;
			const dy = bulletBody.y - playerBody.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			
			// Return true if within 50 units
			return distance < 100;
		},
		ui: { displayName: '🎯 isBulletNear' }
	});

	// ====================================
	// Mutation Spells - Modify GameState
	// ====================================

	// game::spawnFireball(state: GameState, position: Vector2D, direction: Vector2D) -> GameState
	evaluator.registerFunction({
		fullName: 'game::spawnFireball',
		params: ['state', 'position', 'direction'],
		fn: (state: Value, position: Value, direction: Value): Value => {
			assertGameState(state);
			const manager = getManager();

			// Extract x, y from Vector2D functions
			const posX = evaluator.callFunctionValue(position as FunctionValue, 'x') as number;
			const posY = evaluator.callFunctionValue(position as FunctionValue, 'y') as number;
			const dirX = evaluator.callFunctionValue(direction as FunctionValue, 'x') as number;
			const dirY = evaluator.callFunctionValue(direction as FunctionValue, 'y') as number;

			const scene = manager.world.resources.scene;
			// Play fireball cast visual effect
			playFireballCast(scene, posX, posY, dirX, dirY);

			// Spawn fireball (mutates world)
			spawnFireball(
				manager.world,
				scene,
				manager.world.resources.bodies,
				manager.casterEid,
				posX,
				posY,
				dirX,
				dirY
			);

			// Return same state (mutations already applied)
			return state;
		},
		ui: { displayName: '🔥 spawnFireball' }
	});

	// game::healEntity(state: GameState, entity: Entity, amount: number) -> GameState
	evaluator.registerFunction({
		fullName: 'game::healEntity',
		params: ['state', 'entity', 'amount'],
		fn: (state: Value, entity: Value, amount: Value): Value => {
			assertGameState(state);
			
			if (typeof entity !== 'number') {
				throw new Error('Entity must be a number');
			}
			if (typeof amount !== 'number') {
				throw new Error('Amount must be a number');
			}
			
			// Heal entity
			if (Health.current[entity] !== undefined) {
				Health.current[entity] = Math.min(
					Health.current[entity] + amount,
					Health.max[entity]
				);
			}
			
			return state;
		},
		ui: { displayName: '💚 healEntity' }
	});

	// game::teleportRelative(state: GameState, entity: Entity, offset: Vector2D) -> GameState
	evaluator.registerFunction({
		fullName: 'game::teleportRelative',
		params: ['state', 'entity', 'offset'],
		fn: (state: Value, entity: Value, offset: Value): Value => {
			assertGameState(state);
			const manager = getManager();

			if (typeof entity !== 'number') {
				throw new Error('Entity must be a number');
			}

			// Extract offset from Vector2D
			const offsetX = evaluator.callFunctionValue(offset as FunctionValue, 'x') as number;
			const offsetY = evaluator.callFunctionValue(offset as FunctionValue, 'y') as number;

			// Get entity body and teleport
			const body = manager.world.resources.bodies.get(entity);
			if (body) {
				const scene = manager.world.resources.scene;
				const newX = body.x + offsetX;
				const newY = body.y + offsetY;
				// Play teleport visual effect at destination
				playTeleport(scene, newX, newY);

				// Use physics body reset so both the arcade Body and the
				// game object move together. Setting image.x directly only
				// updates the display position; the physics engine reverts it
				// on the next postUpdate, so the teleport would appear to snap back.
				const arcadeBody = body.body as Phaser.Physics.Arcade.Body;
				arcadeBody.reset(newX, newY);
			}

			return state;
		},
		ui: { displayName: '🌀 teleportRelative' }
	});

	// ====================================
	// Event System
	// ====================================

	// game::emitEvent(state: GameState, eventName: string, payload: any) -> GameState
	// Emits a custom event that can be handled by registered spells
	// payload: any data to pass along with the event (e.g., bullet entity, damage amount, etc.)
	evaluator.registerFunction({
		fullName: 'game::emitEvent',
		params: ['state', 'eventName', 'payload'],
		fn: (state: Value, eventName: Value, payload: Value): Value => {
			assertGameState(state);
			
			if (typeof eventName !== 'string') {
				throw new Error('Event name must be a string');
			}
			
			// Emit event with payload
			eventQueue.emit(eventName, state, payload);
			
			return state;
		},
		ui: { displayName: '📡 emitEvent' }
	});

	// ====================================
	// Sniper / Targeting Functions
	// ====================================

	// game::getAllEnemies(state: GameState) -> List<eid>
	// Returns a functional list of all living enemy entity IDs
	evaluator.registerFunction({
		fullName: 'game::getAllEnemies',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const enemies: number[] = [];

			for (const eid of query(manager.world, [Enemy, Health])) {
				if ((Health.current[eid] ?? 0) > 0) {
					enemies.push(eid);
				}
			}

			return evaluator.callFunction('list::fromArray', enemies as any);
		},
		ui: { displayName: '👾 getAllEnemies' }
	});

	// game::getEntityHealth(state: GameState, eid: number) -> number
	// Returns current HP of the entity. Returns -1 for invalid/non-existent entities.
	evaluator.registerFunction({
		fullName: 'game::getEntityHealth',
		params: ['state', 'eid'],
		fn: (state: Value, eid: Value): Value => {
			assertGameState(state);
			if (typeof eid !== 'number' || eid < 0) return -1;
			const hp = Health.current[eid];
			return hp !== undefined ? hp : -1;
		},
		ui: { displayName: '❤️ getEntityHealth' }
	});

	// game::damageEntity(state: GameState, eid: number, amount: number) -> GameState
	// Deals direct damage to a specific entity by ID.
	evaluator.registerFunction({
		fullName: 'game::damageEntity',
		params: ['state', 'eid', 'amount'],
		fn: (state: Value, eid: Value, amount: Value): Value => {
			assertGameState(state);
			if (typeof eid !== 'number') throw new Error('eid must be a number');
			if (typeof amount !== 'number') throw new Error('amount must be a number');
			const manager = getManager();

			if (Health.current[eid] !== undefined && Health.current[eid] > 0) {
				Health.current[eid] = Math.max(0, Health.current[eid] - amount);

				const scene = manager.world.resources.scene as Phaser.Scene;

				// If this level registered civilian eids, fire a scene event on hit
				const civilianEids = manager.world.resources.levelData?.['civilianEids'] as Set<number> | undefined;
				if (civilianEids?.has(eid)) {
					scene.events.emit('civilian-hit', eid);
				}

				// Generic per-damage callback hook for level-specific mechanics
				// (overkill tracking, shield restoration, etc.)
				const onDamage = manager.world.resources.levelData?.['onDamage'] as ((eid: number, amount: number) => void) | undefined;
				if (onDamage) {
					onDamage(eid, amount);
				}

				// Damage hit visual: impact flash + shockwave rings + particle burst + floating number
				const body = manager.world.resources.bodies.get(eid);
				if (body) {
					playDamageHit(scene, body.x, body.y, amount);
				}
			}

			return state;
		},
		ui: { displayName: '⚔️ damageEntity' }
	});

	// game::setTimeout(state: GameState, callback: Function, delayMs: number) -> GameState
	// Schedules a spell/function to execute after a delay
	// The callback will receive a fresh GameState when it executes
	evaluator.registerFunction({
		fullName: 'game::setTimeout',
		params: ['state', 'callback', 'delayMs'],
		fn: (state: Value, callback: Value, delayMs: Value): Value => {
			assertGameState(state);

			if (typeof delayMs !== 'number') {
				throw new Error('Delay must be a number');
			}

			if (typeof callback !== 'object' || callback === null || !('type' in callback) || callback.type !== 'function') {
				throw new Error('Callback must be a function');
			}

			const callbackFn = callback as FunctionValue;

			// Schedule the callback execution
			setTimeout(() => {
				try {
					// Create a fresh GameState for the callback
					const freshState: GameState = {
						type: 'gamestate',
						__runtimeRef: Symbol('GameState')
					};

					console.log(`[setTimeout] Executing callback after ${delayMs}ms delay`);
					
					// Execute the callback with the fresh state
					evaluator.callFunctionValue(callbackFn, freshState);
				} catch (error) {
					console.error('[setTimeout] Error executing delayed callback:', error);
				}
			}, delayMs);

			console.log(`[setTimeout] Scheduled callback to execute after ${delayMs}ms`);

			// Return immediately with current state
			return state;
		},
		ui: { displayName: '⏰ setTimeout' }
	});

	// ====================================
	// Level 6–9: levelData-backed queries
	// ====================================

	// game::detectTreasure(state: GameState, chestIndex: number) -> boolean
	// Level 6: returns true if chest at index contains treasure, false if bomb. Uses levelData.chests.
	evaluator.registerFunction({
		fullName: 'game::detectTreasure',
		params: ['state', 'chestIndex'],
		fn: (state: Value, chestIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof chestIndex !== 'number' || chestIndex < 0) return false;
			const chests = manager.world.resources.levelData?.['chests'] as Array<{ item?: boolean }> | undefined;
			if (!chests || !chests[chestIndex]) return false;
			return chests[chestIndex].item === true;
		},
		ui: { displayName: '📦 detectTreasure' }
	});

	// game::getChestIndices(state: GameState) -> List<number>
	// Level 6: returns list [0,1,2,3,4] for filter + head pattern (Level19-style).
	evaluator.registerFunction({
		fullName: 'game::getChestIndices',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			return evaluator.callFunction('list::fromArray', [0, 1, 2, 3, 4] as any);
		},
		ui: { displayName: '📋 getChestIndices' }
	});

	// game::openChest(state: GameState, chestIndex: number) -> GameState
	// Level 6: requests the level to open the chest at index (the one with treasure). Level processes _openChestIndex next frame.
	evaluator.registerFunction({
		fullName: 'game::openChest',
		params: ['state', 'chestIndex'],
		fn: (state: Value, chestIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof chestIndex !== 'number' || chestIndex < 0) return state;
			if (!manager.world.resources.levelData) return state;
			manager.world.resources.levelData['_openChestIndex'] = chestIndex;
			return state;
		},
		ui: { displayName: '📂 openChest' }
	});

	// game::getLightColor(state: GameState, id: number) -> string
	// Level 9: returns "green" | "red" | "yellow" for light id. Uses levelData.lights.
	evaluator.registerFunction({
		fullName: 'game::getLightColor',
		params: ['state', 'id'],
		fn: (state: Value, id: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof id !== 'number') return '';
			const lights = manager.world.resources.levelData?.['lights'] as Array<{ ID: number; color: string }> | undefined;
			if (!lights) return '';
			const light = lights.find((l: { ID: number }) => l.ID === id);
			return light ? light.color : '';
		},
		ui: { displayName: '🚦 getLightColor' }
	});

	// game::getBallIndices(state: GameState) -> List<number>
	// Level 7: returns list of ball indices [0..n-1]. Uses levelData.balls (array of { index, weight }).
	evaluator.registerFunction({
		fullName: 'game::getBallIndices',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const balls = manager.world.resources.levelData?.['balls'] as Array<{ index: number; weight: number }> | undefined;
			if (!balls || !Array.isArray(balls)) return evaluator.callFunction('list::fromArray', [] as any);
			const indices = balls.map((b: { index: number }) => b.index);
			return evaluator.callFunction('list::fromArray', indices as any);
		},
		ui: { displayName: '🔢 getBallIndices' }
	});

	// game::getBallWeight(state: GameState, ballIndex: number) -> number
	// Level 7/8: returns weight of ball at index. Uses levelData.balls.
	evaluator.registerFunction({
		fullName: 'game::getBallWeight',
		params: ['state', 'ballIndex'],
		fn: (state: Value, ballIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof ballIndex !== 'number' || ballIndex < 0) return 0;
			const balls = manager.world.resources.levelData?.['balls'] as Array<{ index: number; weight: number }> | undefined;
			if (!balls) return 0;
			const b = balls.find((x: { index: number }) => x.index === ballIndex);
			return b ? b.weight : 0;
		},
		ui: { displayName: '⚖️ getBallWeight' }
	});

	// game::isHeaviestBall(state: GameState, ballIndex: number) -> boolean
	// Level 7: returns true iff the ball at index has the maximum weight among all balls.
	evaluator.registerFunction({
		fullName: 'game::isHeaviestBall',
		params: ['state', 'ballIndex'],
		fn: (state: Value, ballIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof ballIndex !== 'number' || ballIndex < 0) return false;
			const balls = manager.world.resources.levelData?.['balls'] as Array<{ index: number; weight: number }> | undefined;
			if (!balls || balls.length === 0) return false;
			const maxWeight = Math.max(...balls.map((b: { weight: number }) => b.weight));
			const b = balls.find((x: { index: number }) => x.index === ballIndex);
			return b ? b.weight === maxWeight : false;
		},
		ui: { displayName: '⬆️ isHeaviestBall' }
	});

	// game::getRemainingBallIndices(state: GameState) -> List<number>
	// Level 8: returns indices of balls not yet thrown. Uses levelData.remainingBallIndices.
	evaluator.registerFunction({
		fullName: 'game::getRemainingBallIndices',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const remaining = manager.world.resources.levelData?.['remainingBallIndices'] as number[] | undefined;
			if (!remaining || !Array.isArray(remaining)) return evaluator.callFunction('list::fromArray', [] as any);
			return evaluator.callFunction('list::fromArray', remaining as any);
		},
		ui: { displayName: '🔢 getRemainingBallIndices' }
	});

	// game::isLightestBall(state: GameState, ballIndex: number) -> boolean
	// Level 8: among remaining balls, returns true iff this ball has the minimum weight.
	evaluator.registerFunction({
		fullName: 'game::isLightestBall',
		params: ['state', 'ballIndex'],
		fn: (state: Value, ballIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof ballIndex !== 'number' || ballIndex < 0) return false;
			const balls = manager.world.resources.levelData?.['balls'] as Array<{ index: number; weight: number }> | undefined;
			const remaining = manager.world.resources.levelData?.['remainingBallIndices'] as number[] | undefined;
			if (!balls || !remaining || remaining.length === 0) return false;
			const remainingWeights = remaining.map((i: number) => {
				const b = balls.find((x: { index: number }) => x.index === i);
				return b ? b.weight : Infinity;
			});
			const minWeight = Math.min(...remainingWeights);
			const b = balls.find((x: { index: number }) => x.index === ballIndex);
			if (!b || !remaining.includes(ballIndex)) return false;
			return b.weight === minWeight;
		},
		ui: { displayName: '⬇️ isLightestBall' }
	});

	// game::throwBallToGate(state: GameState, ballIndex: number) -> GameState
	// Level 7/8: requests level to throw the ball at index to the gate. Level processes _throwBallIndex next frame.
	evaluator.registerFunction({
		fullName: 'game::throwBallToGate',
		params: ['state', 'ballIndex'],
		fn: (state: Value, ballIndex: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (typeof ballIndex !== 'number' || ballIndex < 0) return state;
			if (!manager.world.resources.levelData) return state;
			manager.world.resources.levelData['_throwBallIndex'] = ballIndex;
			return state;
		},
		ui: { displayName: '🎯 throwBallToGate' }
	});

	// game::getWeight(state: GameState) -> number | null
	// Level 7 (legacy): returns current ball weight. Uses levelData.currentBallWeight.
	evaluator.registerFunction({
		fullName: 'game::getWeight',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const w = manager.world.resources.levelData?.['currentBallWeight'];
			return w != null && typeof w === 'number' ? w : 0;
		},
		ui: { displayName: '⚖️ getWeight' }
	});

	// game::measureWeight(state: GameState) -> number | null
	// Level 7/8: returns current ball weight (for use in spell only; level may hide from HUD). Uses levelData.currentBallWeight.
	evaluator.registerFunction({
		fullName: 'game::measureWeight',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const w = manager.world.resources.levelData?.['currentBallWeight'];
			return w != null && typeof w === 'number' ? w : 0;
		},
		ui: { displayName: '⚖️ measureWeight' }
	});

	// game::setSlot(state: GameState, slotId: number, value: number) -> GameState
	// game::getSlot(state: GameState, slotId: number) -> number | null
	// game::clearSlots(state: GameState) -> GameState
	// Level 8: temporary storage for sorting. Uses levelData.slot1, slot2.
	evaluator.registerFunction({
		fullName: 'game::setSlot',
		params: ['state', 'slotId', 'value'],
		fn: (state: Value, slotId: Value, value: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (!manager.world.resources.levelData) return state;
			const id = typeof slotId === 'number' ? slotId : 0;
			const v = typeof value === 'number' ? value : null;
			if (id === 1) manager.world.resources.levelData['slot1'] = v;
			else if (id === 2) manager.world.resources.levelData['slot2'] = v;
			return state;
		},
		ui: { displayName: '📥 setSlot' }
	});
	evaluator.registerFunction({
		fullName: 'game::getSlot',
		params: ['state', 'slotId'],
		fn: (state: Value, slotId: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			const id = typeof slotId === 'number' ? slotId : 0;
			if (id === 1) return (manager.world.resources.levelData?.['slot1'] as Value) ?? 0;
			if (id === 2) return (manager.world.resources.levelData?.['slot2'] as Value) ?? 0;
			return 0;
		},
		ui: { displayName: '📤 getSlot' }
	});
	evaluator.registerFunction({
		fullName: 'game::clearSlots',
		params: ['state'],
		fn: (state: Value): Value => {
			assertGameState(state);
			const manager = getManager();
			if (manager.world.resources.levelData) {
				manager.world.resources.levelData['slot1'] = null;
				manager.world.resources.levelData['slot2'] = null;
			}
			return state;
		},
		ui: { displayName: '🗑️ clearSlots' }
	});
}


