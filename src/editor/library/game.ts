import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue, GameState } from '../ast/ast';
import { GameStateManager } from '../../game/state/GameStateManager';
import { Health } from '../../game/components';
import { spawnFireball } from '../../game/prefabs/spawnFireball';
import { eventQueue } from '../../game/events/EventQueue';

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

	// game::setTimeout(state: GameState, callback: Function, delayMs: number) -> GameState
	// Schedules a spell/function to execute after a delay
	// The callback will receive a fresh GameState when it executes
	evaluator.registerFunction({
		fullName: 'game::setTimeout',
		params: ['state', 'callback', 'delayMs'],
		fn: (state: Value, callback: Value, delayMs: Value): Value => {
			assertGameState(state);
			const manager = getManager();

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


