import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue, GameState } from '../ast/ast';
import { GameStateManager } from '../../game/state/GameStateManager';
import { Health, FireballStats, Owner } from '../../game/components';
import { spawnFireball } from '../../game/prefabs/spawnFireball';
import { eventQueue } from '../../game/events/EventQueue';
import type { GameWorld } from '../../game/gameWorld';

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
			
			// Spawn fireball (mutates world)
			spawnFireball(
				manager.world,
				manager.world.resources.scene,
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

	// game::emitEvent(state: GameState, eventName: string, ...args: any) -> GameState
	// Emits a custom event that can be handled by registered spells
	evaluator.registerFunction({
		fullName: 'game::emitEvent',
		params: ['state', 'eventName'],
		fn: (state: Value, eventName: Value, ...extraArgs: Value[]): Value => {
			assertGameState(state);

			if (typeof eventName !== 'string') {
				throw new Error('Event name must be a string');
			}

			eventQueue.emit(eventName, state, ...extraArgs);

			return state;
		},
		ui: { displayName: '📡 emitEvent' }
	});

	// ====================================
	// Deflection Spells - Fireball Control
	// ====================================

	// game::deflectAfterTime(state: GameState, angle: number, delayMs: number) -> GameState
	// Adds a time-based deflection to the most recently spawned fireball's queue
	// Multiple calls will queue multiple deflections that execute sequentially
	evaluator.registerFunction({
		fullName: 'game::deflectAfterTime',
		params: ['state', 'angle', 'delayMs'],
		fn: (state: Value, angle: Value, delayMs: Value): Value => {
			assertGameState(state);
			const manager = getManager();

			if (typeof angle !== 'number') {
				throw new Error('Angle must be a number');
			}
			if (typeof delayMs !== 'number') {
				throw new Error('Delay must be a number');
			}

			// Find fireballs owned by caster
			const fireballs = findFireballsByOwner(manager.world, manager.casterEid);
			if (fireballs.length === 0) {
				console.warn('[deflectAfterTime] No fireball found');
				return state;
			}

			// Apply to the most recent fireball
			const fireballEid = fireballs[fireballs.length - 1];

			// Initialize queue if not exists
			if (!FireballStats.deflectionQueue[fireballEid]) {
				FireballStats.deflectionQueue[fireballEid] = [];
			}

			// Add to deflection queue
			FireballStats.deflectionQueue[fireballEid].push({
				angle: angle,
				triggerTime: Date.now() + delayMs
			});

			console.log(`[deflectAfterTime] Queued deflection: ${angle}° after ${delayMs}ms (queue size: ${FireballStats.deflectionQueue[fireballEid].length})`);

			return state;
		},
		ui: { displayName: '🔄 deflectAfterTime' }
	});
}

// Helper function to find fireballs owned by a specific entity
function findFireballsByOwner(world: GameWorld, ownerEid: number): number[] {
	const result: number[] = [];
	for (const [eid, _body] of world.resources.bodies.entries()) {
		if (Owner.eid[eid] === ownerEid && FireballStats.speed[eid] !== undefined) {
			result.push(eid);
		}
	}
	return result;
}
