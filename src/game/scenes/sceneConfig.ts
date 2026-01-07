import type { ObjectiveConfig } from './base/TerrainTypes'

export type SceneConfig = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	mapData?: number[][] // 0: 空地, 1: 墙壁, 2: 平台, 3: 危险区, 4: 目标点
	tileSize?: number
	objectives?: ObjectiveConfig[]
}

// 快速生成围墙房间
function createRoom(w: number, h: number): number[][] {
	return Array.from({ length: h }, (_, y) =>
		Array.from({ length: w }, (_, x) => (x === 0 || x === w - 1 || y === 0 || y === h - 1 ? 1 : 0))
	)
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
	// Level 1 - 逻辑之门（教学关卡）
	Level1: {
		key: 'Level1',
		playerSpawnX: 120,
		playerSpawnY: 270,
		objectives: [
			{
				id: 'defeat-boss',
				description: 'Use teleportRelative to approach and defeat Boss',
				type: 'defeat',
			},
			{
				id: 'collect-markers',
				description: 'Collect 3 markers (0/3)',
				type: 'collect',
				prerequisite: 'defeat-boss',
			},
		],
	},

	// Level 2 - Boss战（独立系统）
	Level2: {
		key: 'Level2',
		playerSpawnX: 480,
		playerSpawnY: 400,
	},

	// Level 3 - 战斗关卡
	Level3: {
		key: 'Level3',
		playerSpawnX: 480,
		playerSpawnY: 270,
		tileSize: 80,
		mapData: createRoom(12, 8),
	},

	// Level 4 - Deflection Proving Grounds（偏转试炼场）
	Level4: {
		key: 'Level4',
		playerSpawnX: 120,
		playerSpawnY: 400,
		tileSize: 64,
		mapData: createRoom(15, 9),
		objectives: [
			{
				id: 'task1-combined',
				description: 'Task 1: Use combined conditions (age>300ms AND distance>200px) to deflect',
				type: 'defeat',
			},
			{
				id: 'task2-lshape',
				description: 'Task 2: Hit L-shape target with double deflection (90° twice)',
				type: 'defeat',
				prerequisite: 'task1-combined',
			},
			{
				id: 'task3-boomerang',
				description: 'Task 3: Create boomerang effect with 180° deflection',
				type: 'defeat',
				prerequisite: 'task2-lshape',
			},
		],
	},

	// Level 5
	Level5: {
		key: 'Level5',
		playerSpawnX: 96,
		playerSpawnY: 96,
		tileSize: 64,
		mapData: [
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
			[1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
			[1, 0, 1, 0, 0, 0, 3, 1, 0, 1],
			[1, 0, 1, 1, 1, 1, 3, 1, 0, 1],
			[1, 0, 0, 3, 3, 0, 0, 0, 0, 1],
			[1, 0, 1, 1, 1, 0, 1, 1, 4, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'survive',
				description: 'Reach goal without touching red hazards',
				type: 'reach',
			},
		],
	},

	// 批量生成 Level 6-20
	...Object.fromEntries(
		Array.from({ length: 15 }, (_, i) => [
			`Level${i + 6}`,
			{
				key: `Level${i + 6}`,
				playerSpawnX: 96,
				playerSpawnY: 288,
				mapData: createRoom(15, 9),
				tileSize: 64,
			},
		])
	),
}

export function getSceneConfig(sceneKey: string) {
	return SCENE_CONFIGS[sceneKey]
}

export function getPlayerSpawnPosition(sceneKey: string) {
	const cfg = getSceneConfig(sceneKey)
	return cfg ? { x: cfg.playerSpawnX, y: cfg.playerSpawnY } : { x: 200, y: 270 }
}
