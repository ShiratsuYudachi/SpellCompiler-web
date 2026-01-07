import type { ObjectiveConfig } from './base/TerrainTypes'

export type GateConfig = {
	x: number
	y: number
	width: number
	height: number
	color: number
	targetScene: string
	label: string
	sceneData?: any
}

export type SceneConfig = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	gates: GateConfig[]
	mapData?: number[][] // 0: 空地, 1: 墙壁, 2: 平台, 3: 危险区, 4: 目标点
	tileSize?: number
	objectives?: ObjectiveConfig[]
}

// Back gate (right center)
function createBackToSelectGate(): GateConfig {
	return {
		x: 900,  // Right side (960 - 60)
		y: 270,  // Center (540 / 2)
		width: 60,
		height: 120,
		color: 0x4a90e2,
		targetScene: 'LevelSelectScene',
		label: 'EXIT',
	}
}

// 快速生成围墙房间
function createRoom(w: number, h: number): number[][] {
	return Array.from({ length: h }, (_, y) =>
		Array.from({ length: w }, (_, x) => (x === 0 || x === w - 1 || y === 0 || y === h - 1 ? 1 : 0))
	)
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
	MainScene: {
		key: 'MainScene',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [
			{
				x: 480,
				y: 50,
				width: 120,
				height: 40,
				color: 0x00ff00,
				targetScene: 'LevelSelectScene',
				label: 'Level Select →',
			},
		],
	},

	LevelSelectScene: {
		key: 'LevelSelectScene',
		playerSpawnX: 480,
		playerSpawnY: 270,
		gates: [],
	},

	// Level 1 - 逻辑之门（教学关卡）
	Level1: {
		key: 'Level1',
		playerSpawnX: 120,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
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
		gates: [createBackToSelectGate()],
	},

	// Level 3 - 战斗关卡
	Level3: {
		key: 'Level3',
		playerSpawnX: 480,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
		tileSize: 80,
		mapData: createRoom(12, 8),
	},

	// Level 4 - 示例：平台跳跃 + 渐进式任务
	Level4: {
		key: 'Level4',
		playerSpawnX: 96,
		playerSpawnY: 320,
		gates: [createBackToSelectGate()],
		tileSize: 64,
		mapData: [
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 2, 2, 2, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1],
			[1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1',
				description: 'Jump on platforms',
				type: 'reach',
			},
			{
				id: 'task2',
				description: 'Avoid red hazards',
				type: 'reach',
				prerequisite: 'task1',
			},
			{
				id: 'task3',
				description: 'Reach green objective',
				type: 'reach',
				prerequisite: 'task2',
			},
		],
	},

	// Level 5
	Level5: {
		key: 'Level5',
		playerSpawnX: 96,
		playerSpawnY: 96,
		gates: [createBackToSelectGate()],
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
				gates: [createBackToSelectGate()],
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

export function getPlayerSpawnNearGate(targetSceneKey: string, gateIndex: number = 0) {
	const config = getSceneConfig(targetSceneKey)
	if (config && config.gates[gateIndex]) {
		const gate = config.gates[gateIndex]
		const offsetX = gate.x < 480 ? gate.width + 20 : -(gate.width + 20)
		return { x: gate.x + offsetX, y: gate.y }
	}
	return getPlayerSpawnPosition(targetSceneKey)
}

export function getSceneGates(sceneKey: string): GateConfig[] {
	const config = getSceneConfig(sceneKey)
	return config?.gates || []
}
