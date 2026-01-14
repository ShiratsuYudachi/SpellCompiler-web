import { query } from 'bitecs'
import { Enemy, Health, Sprite } from '../../components'
import type { GameWorld } from '../../gameWorld'
import { flashBody } from './flash'

export function areaAttack(
	world: GameWorld,
	attackerEid: number,
	location: { x: number; y: number },
	radius: number,
	damage: number,
) {
	const ring = world.resources.scene.add.circle(location.x, location.y, radius, 0xffffff, 0.25)
	ring.setDepth(50)
	ring.setScale(0.2)
	world.resources.scene.tweens.add({
		targets: ring,
		scale: 1,
		alpha: 0,
		duration: 150,
		onComplete: () => ring.destroy(),
	})

	areaDamage(world, attackerEid, location, radius, damage)
}

export function areaDamage(
	world: GameWorld,
	attackerEid: number,
	location: { x: number; y: number },
	radius: number,
	damage: number,
) {
	const { x, y } = location
	const processedEntities = new Set<number>()

	// Check all entities with Sprite and Health components
	for (const targetEid of query(world, [Sprite, Health])) {
		if (targetEid === attackerEid) {
			continue
		}

		const body = world.resources.bodies.get(targetEid)
		if (!body) {
			continue
		}

		const dx = body.x - x
		const dy = body.y - y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist > radius) {
			continue
		}

		applyDamage(world, targetEid, damage)
		processedEntities.add(targetEid)
	}

	// Explicitly check player entity to ensure it can be damaged
	// This is a fallback in case the player wasn't caught by the query above
	const playerEid = world.resources.playerEid
	if (playerEid !== undefined && playerEid !== attackerEid && !processedEntities.has(playerEid)) {
		const playerBody = world.resources.bodies.get(playerEid)
		if (playerBody) {
			const dx = playerBody.x - x
			const dy = playerBody.y - y
			const dist = Math.sqrt(dx * dx + dy * dy)
			if (dist <= radius) {
				// Check if player has Health component before applying damage
				if (Health.current[playerEid] !== undefined) {
					applyDamage(world, playerEid, damage)
					processedEntities.add(playerEid)
				}
			}
		}
	}

	// Explicitly check all enemy entities to ensure they can be damaged
	// This is a fallback in case enemies weren't caught by the query above
	for (const enemyEid of query(world, [Enemy, Sprite, Health])) {
		if (enemyEid === attackerEid || processedEntities.has(enemyEid)) {
			continue
		}

		const enemyBody = world.resources.bodies.get(enemyEid)
		if (!enemyBody) {
			continue
		}

		const dx = enemyBody.x - x
		const dy = enemyBody.y - y
		const dist = Math.sqrt(dx * dx + dy * dy)
		if (dist <= radius) {
			// Check if enemy has Health component before applying damage
			if (Health.current[enemyEid] !== undefined) {
				applyDamage(world, enemyEid, damage)
				processedEntities.add(enemyEid)
			}
		}
	}
}

export function applyDamage(world: GameWorld, targetEid: number, damage: number) {
	const before = Health.current[targetEid]
	Health.current[targetEid] = Math.max(0, Health.current[targetEid] - damage)
	if (Health.current[targetEid] !== before) {
		const body = world.resources.bodies.get(targetEid)
		if (body) {
			flashBody(world.resources.scene, body)
		}
	}
}


