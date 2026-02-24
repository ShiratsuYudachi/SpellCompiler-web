import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue, GameState } from '../ast/ast';
import { query } from 'bitecs';
import { GameStateManager } from '../../game/state/GameStateManager';
import { Health, Enemy } from '../../game/components';
import { spawnFireball } from '../../game/prefabs/spawnFireball';
import { eventQueue } from '../../game/events/EventQueue';
import { playTeleport, playFireballCast } from '../../game/SpellVisual/SpellVisualManager';

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
				// Play teleport visual effect at destination
				playTeleport(scene, body.x + offsetX, body.y + offsetY);

				body.x += offsetX;
				body.y += offsetY;
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

				// Brief flash visual on the target
				const body = manager.world.resources.bodies.get(eid);
				if (body) {
					scene.tweens.add({
						targets: body,
						alpha: 0.15,
						duration: 70,
						yoyo: true,
						onComplete: () => { if (body.active) body.setAlpha(1); }
					});
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
}


