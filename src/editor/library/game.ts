import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue, GameState } from '../ast/ast';
import { GameStateManager } from '../../game/state/GameStateManager';
import { Health } from '../../game/components';

// Lazy import to avoid circular dependencies
let spawnFireballFn: typeof import('../../game/prefabs/spawnFireball').spawnFireball | undefined;

function getSpawnFireball() {
	if (!spawnFireballFn) {
		// Dynamic import - will be available in game runtime, mocked in tests
		try {
			spawnFireballFn = require('../../game/prefabs/spawnFireball').spawnFireball;
		} catch {
			// In test environment, use a no-op function that matches the signature
			spawnFireballFn = ((_world: any, _scene: any, _bodies: any, _ownerEid: any, _x: any, _y: any, _dirX: any, _dirY: any) => {
				return 0; // Return dummy entity ID
			}) as any;
		}
	}
	return spawnFireballFn;
}

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
	// GameState Creation
	// ===================================
	
	// game::initState() -> GameState
	// Creates the initial GameState token for the spell
	evaluator.registerFunction({
		fullName: 'game::initState',
		params: [],
		fn: (): Value => {
			const gameState: GameState = {
				type: 'gamestate',
				__runtimeRef: Symbol('GameState')
			};
			return gameState;
		},
		ui: { displayName: '🎮 initState' }
	});
	
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
			const spawnFireball = getSpawnFireball();
			if (spawnFireball) {
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
			}
			
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
	// Deprecated / NotImplemented
	// ====================================

	// game::onTrigger - Placeholder for Stage 2 (Event system)
	evaluator.registerFunction({
		fullName: 'game::onTrigger',
		params: ['triggerType', 'condition', 'action'],
		fn: (_triggerType: Value, _condition: Value, _action: Value): Value => {
			console.warn('[game::onTrigger] This function is deprecated and will be reimplemented in Stage 2 with Event system');
			return 0; // Return dummy trigger ID
		},
		ui: { displayName: '⚠️ onTrigger (deprecated)' }
	});
}
