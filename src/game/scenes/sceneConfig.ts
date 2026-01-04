/**
 * Scene Configuration System
 * 
 * This file defines gate positions and player spawn positions for each scene.
 * To add a new scene, simply add a new entry to SCENE_CONFIGS.
 */

export type GateConfig = {
	x: number
	y: number
	width: number
	height: number
	color: number
	targetScene: string
	label: string
}

export type SceneConfig = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	gates: GateConfig[]
}

/**
 * Configuration for all scenes
 * 
 * When adding a new scene:
 * 1. Add a new entry here with the scene key
 * 2. Define player spawn position (where player appears when entering this scene)
 * 3. Define gates (where player can exit to other scenes)
 */
export const SCENE_CONFIGS: Record<string, SceneConfig> = {
	MainScene: {
		key: 'MainScene',
		playerSpawnX: 200, // Default spawn position (first time entering)
		playerSpawnY: 270,
		gates: [
			{
				x: 920,
				y: 270,
				width: 40,
				height: 100,
				color: 0x00ff00, // Green
				targetScene: 'Scene1',
				label: 'Gate\n→ Scene1',
			},
		],
	},
	Scene1: {
		key: 'Scene1',
		playerSpawnX: 120, // Spawn near the left gate (when entering from MainScene)
		playerSpawnY: 270,
		gates: [
			{
				x: 40,
				y: 270,
				width: 40,
				height: 100,
				color: 0xff8800, // Orange
				targetScene: 'MainScene',
				label: 'Gate\n← MainScene',
			},
		],
	},
}

/**
 * Get configuration for a specific scene
 */
export function getSceneConfig(sceneKey: string): SceneConfig | undefined {
	return SCENE_CONFIGS[sceneKey]
}

/**
 * Get player spawn position for a scene
 */
export function getPlayerSpawnPosition(sceneKey: string): { x: number; y: number } {
	const config = getSceneConfig(sceneKey)
	if (config) {
		return { x: config.playerSpawnX, y: config.playerSpawnY }
	}
	// Default spawn position if scene not found
	return { x: 200, y: 270 }
}

/**
 * Get player spawn position near a specific gate in the target scene
 * This is used when transitioning from one scene to another via a gate
 */
export function getPlayerSpawnNearGate(targetSceneKey: string, gateIndex: number = 0): { x: number; y: number } {
	const config = getSceneConfig(targetSceneKey)
	if (config && config.gates[gateIndex]) {
		const gate = config.gates[gateIndex]
		// Spawn player next to the gate (offset by gate width + some padding)
		const offsetX = gate.x < 480 ? gate.width + 20 : -(gate.width + 20) // Left side or right side
		return {
			x: gate.x + offsetX,
			y: gate.y,
		}
	}
	// Fallback to default spawn position
	return getPlayerSpawnPosition(targetSceneKey)
}

/**
 * Get all gates for a scene
 */
export function getSceneGates(sceneKey: string): GateConfig[] {
	const config = getSceneConfig(sceneKey)
	return config?.gates || []
}

