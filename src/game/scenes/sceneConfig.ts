/**
 * Scene Configuration System
 * 支持主场景、关卡选择和20个关卡
 */

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
}

/**
 * 生成返回关卡选择的gate配置
 */
function createBackToSelectGate(): GateConfig {
	return {
		x: 480,
		y: 520,
		width: 100,
		height: 40,
		color: 0xff0000,
		targetScene: 'LevelSelectScene',
		label: '← Level Select',
	}
}

/**
 * 所有场景配置
 */
export const SCENE_CONFIGS: Record<string, SceneConfig> = {
	// 主场景
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

	// 关卡选择场景
	LevelSelectScene: {
		key: 'LevelSelectScene',
		playerSpawnX: 480,
		playerSpawnY: 270,
		gates: [], // 通过UI按钮切换，不用gate
	},

	// Level 1 (原Scene1 - Puzzle)
	Level1: {
		key: 'Level1',
		playerSpawnX: 120,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},

	// Level 2 (原BossBattleTestScene - Boss Battle)
	Level2: {
		key: 'Level2',
		playerSpawnX: 480,
		playerSpawnY: 400,
		gates: [createBackToSelectGate()],
	},

	// Level 3 (原CombatScene - Combat)
	Level3: {
		key: 'Level3',
		playerSpawnX: 480,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},

	// Level 4-20 (空关卡)
	Level4: {
		key: 'Level4',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level5: {
		key: 'Level5',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level6: {
		key: 'Level6',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level7: {
		key: 'Level7',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level8: {
		key: 'Level8',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level9: {
		key: 'Level9',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level10: {
		key: 'Level10',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level11: {
		key: 'Level11',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level12: {
		key: 'Level12',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level13: {
		key: 'Level13',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level14: {
		key: 'Level14',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level15: {
		key: 'Level15',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level16: {
		key: 'Level16',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level17: {
		key: 'Level17',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level18: {
		key: 'Level18',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level19: {
		key: 'Level19',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
	Level20: {
		key: 'Level20',
		playerSpawnX: 200,
		playerSpawnY: 270,
		gates: [createBackToSelectGate()],
	},
}

export function getSceneConfig(sceneKey: string): SceneConfig | undefined {
	return SCENE_CONFIGS[sceneKey]
}

export function getPlayerSpawnPosition(sceneKey: string): { x: number; y: number } {
	const config = getSceneConfig(sceneKey)
	if (config) {
		return { x: config.playerSpawnX, y: config.playerSpawnY }
	}
	return { x: 200, y: 270 }
}

export function getPlayerSpawnNearGate(targetSceneKey: string, gateIndex: number = 0): { x: number; y: number } {
	const config = getSceneConfig(targetSceneKey)
	if (config && config.gates[gateIndex]) {
		const gate = config.gates[gateIndex]
		const offsetX = gate.x < 480 ? gate.width + 20 : -(gate.width + 20)
		return {
			x: gate.x + offsetX,
			y: gate.y,
		}
	}
	return getPlayerSpawnPosition(targetSceneKey)
}

export function getSceneGates(sceneKey: string): GateConfig[] {
	const config = getSceneConfig(sceneKey)
	return config?.gates || []
}
