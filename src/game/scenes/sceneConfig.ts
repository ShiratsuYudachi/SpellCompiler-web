import type { ObjectiveConfig } from './base/TerrainTypes'

export type SceneConfig = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	mapData?: number[][] // 0: 空地, 1: 墙壁, 2: 平台, 3: 危险区, 4: 目标点
	tileSize?: number
	objectives?: ObjectiveConfig[]
	initialSpellWorkflow?: {
		nodes: any[]
		edges: any[]
	}
	editorRestrictions?: RegExp
	allowedNodeTypes?: Array<'literal' | 'triggerType' | 'vector' | 'if' | 'customFunction' | 'applyFunc' | 'lambdaDef' | 'output' | 'dynamicFunction'>
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

		initialSpellWorkflow: {
			nodes: [
				{
					id: 'output-1',
					type: 'output',
					position: { x: 700, y: 220 },
					data: { label: 'Output' },
				},
				{
					id: 'func-teleport',
					type: 'dynamicFunction',
					position: { x: 420, y: 200 },
					data: {
						functionName: 'game::teleportRelative',
						displayName: 'teleportRelative',
						namespace: 'game',
						params: ['entityId', 'offset'],
						parameterModes: {
							offset: {
								current: 'literal-xy',
								options: [
									{
										mode: 'literal-xy',
										label: 'Literal (dx, dy)',
										params: ['dx', 'dy'],
									},
									{
										mode: 'vector',
										label: 'Vector',
										params: ['offset'],
									},
								],
							},
						},
					},
				},
				{
					id: 'func-getPlayer',
					type: 'dynamicFunction',
					position: { x: 140, y: 120 },
					data: {
						functionName: 'game::getPlayer',
						displayName: 'getPlayer',
						namespace: 'game',
						params: [],
					},
				},
				{ id: 'lit-dx', type: 'literal', position: { x: 140, y: 240 }, data: { value: 0 } },
				{ id: 'lit-dy', type: 'literal', position: { x: 140, y: 320 }, data: { value: 0 } },
			],
			edges: [
				{ id: 'e1', source: 'func-teleport', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'func-getPlayer', target: 'func-teleport', targetHandle: 'arg0' },
				{ id: 'e3', source: 'lit-dx', target: 'func-teleport', targetHandle: 'arg1' },
				{ id: 'e4', source: 'lit-dy', target: 'func-teleport', targetHandle: 'arg2' },
			],
		},
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
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Output' } },
			],
			edges: [],
		},
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
		initialSpellWorkflow: {
			nodes: [
				{
					id: 'output-1',
					type: 'output',
					position: { x: 600, y: 250 },
					data: { label: 'Output' },
				},
				{
					id: 'func-deflect',
					type: 'dynamicFunction',
					position: { x: 340, y: 230 },
					data: {
						functionName: 'game::deflectAfterTime',
						displayName: 'deflectAfterTime',
						namespace: 'game',
						params: ['angle', 'delayMs'],
					},
				},
				{ id: 'lit-angle', type: 'literal', position: { x: 100, y: 200 }, data: { value: 90 } },
				{ id: 'lit-delay', type: 'literal', position: { x: 100, y: 280 }, data: { value: 2000 } },
			],
			edges: [
				{ id: 'e1', source: 'func-deflect', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'lit-angle', target: 'func-deflect', targetHandle: 'arg0' },
				{ id: 'e3', source: 'lit-delay', target: 'func-deflect', targetHandle: 'arg1' },
			],
		},
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
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Output' } },
			],
			edges: [],
		},
	},

	// Level 6 - Trigger Mastery（触发器精通）
	Level6: {
		key: 'Level6',
		playerSpawnX: 200,
		playerSpawnY: 270,
		mapData: createRoom(15, 9),
		tileSize: 64,
		objectives: [
			{
				id: 'task1-enemy-nearby',
				description: 'Task 1: Use onEnemyNearby(200) to auto-teleport when enemy approaches',
				type: 'defeat',
			},
			{
				id: 'task2-time-interval',
				description: 'Task 2: Use onTimeInterval(2000) to auto-heal every 2 seconds',
				type: 'defeat',
				prerequisite: 'task1-enemy-nearby',
			},
			{
				id: 'task3-low-health',
				description: 'Task 3: Use onPlayerLowHealth(0.5) to auto-teleport when health < 50%',
				type: 'defeat',
				prerequisite: 'task2-time-interval',
			},
		],
		initialSpellWorkflow: {
			nodes: [
				{
					id: 'output-1',
					type: 'output',
					position: { x: 600, y: 200 },
					data: { label: 'Output' },
				},
				{
					id: 'func-onTrigger',
					type: 'dynamicFunction',
					position: { x: 300, y: 180 },
					data: {
						functionName: 'game::onTrigger',
						displayName: 'onTrigger',
						namespace: 'game',
						params: ['triggerType', 'condition'],
					},
				},
				{
					id: 'lit-triggerType',
					type: 'literal',
					position: { x: 100, y: 120 },
					data: { value: 'onEnemyNearby' },
				},
				{
					id: 'lit-condition',
					type: 'literal',
					position: { x: 100, y: 240 },
					data: { value: 200 },
				},
			],
			edges: [
				{ id: 'e1', source: 'func-onTrigger', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'lit-triggerType', target: 'func-onTrigger', targetHandle: 'arg0' },
				{ id: 'e3', source: 'lit-condition', target: 'func-onTrigger', targetHandle: 'arg1' },
			],
		},
	},

	// Level 7 - Object-Oriented Programming (Two Tasks)
	Level7: {
		key: 'Level7',
		playerSpawnX: 200,
		playerSpawnY: 300,
		mapData: createRoom(15, 9),
		tileSize: 64,
		// Task 1: Allow only getWeight function and output node
		editorRestrictions: /^(game::getWeight)$/,
		// Task 2 (dynamically updated): measureWeight, getThreshold, comparison operators (std::cmp::*)
		// Only allow necessary node types for Task 1
		allowedNodeTypes: ['output', 'dynamicFunction'],
		objectives: [
			{
				id: 'task1-heaviest',
				description: 'Task 1: Find the heaviest ball and throw it to the gate',
				type: 'defeat',
			},
			{
				id: 'task2-classify',
				description: 'Task 2: Classify all balls by weight comparison',
				type: 'defeat',
				prerequisite: 'task1-heaviest',
			},
		],
		// Pre-made spell: getWeight + output
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
				{
					id: 'func-getWeight',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'game::getWeight',
						displayName: 'getWeight',
						namespace: 'game',
						params: [],
					},
				},
			],
			edges: [
				{ id: 'e1', source: 'func-getWeight', target: 'output-1', targetHandle: 'value' },
			],
		},
	},

	// Level 8 - Array and List Operations Challenge
	Level8: {
		key: 'Level8',
		playerSpawnX: 200,
		playerSpawnY: 300,
		mapData: createRoom(15, 9),
		tileSize: 64,
		// Allow only list-related functions: getCollectedBallWeights, list operations, comparison, and logic
		editorRestrictions: /^(game::getCollectedBallWeights|std::list::.*|std::cmp::.*|std::logic::.*)$/,
		// Only allow necessary node types
		allowedNodeTypes: ['output', 'dynamicFunction', 'literal'],
		objectives: [
			{
				id: 'collect-balls',
				description: 'Collect at least 3 balls',
				type: 'collect',
			},
			{
				id: 'verify-count',
				description: 'Use length() to verify you collected at least 3 balls',
				type: 'spell',
				prerequisite: 'collect-balls',
			},
			{
				id: 'throw-heaviest',
				description: 'Find the heaviest ball using sort() + nth() and throw it to the gate',
				type: 'defeat',
				prerequisite: 'verify-count',
			},
			{
				id: 'throw-second-heaviest',
				description: 'Find the second heaviest ball using sort() + tail() + head() and throw it',
				type: 'defeat',
				prerequisite: 'throw-heaviest',
			},
			{
				id: 'throw-heavy-balls',
				description: 'Use filter() + gt() to find all balls heavier than 20 and throw them',
				type: 'defeat',
				prerequisite: 'throw-second-heaviest',
			},
		],
		// Pre-made spell: getCollectedBallWeights -> length -> output
		// Simple example to get started with list operations
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
				{
					id: 'func-getCollectedBallWeights',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'game::getCollectedBallWeights',
						displayName: 'getCollectedBallWeights',
						namespace: 'game',
						params: [],
					},
				},
				{
					id: 'func-length',
					type: 'dynamicFunction',
					position: { x: 300, y: 200 },
					data: {
						functionName: 'std::list::length',
						displayName: 'length',
						namespace: 'std::list',
						params: ['list'],
					},
				},
			],
			edges: [
				{ id: 'e1', source: 'func-getCollectedBallWeights', target: 'func-length', targetHandle: 'arg0' },
				{ id: 'e2', source: 'func-length', target: 'output-1', targetHandle: 'value' },
			],
		},
	},

	// Level 9-10 (placeholder)
	...Object.fromEntries(
		Array.from({ length: 2 }, (_, i) => [
			`Level${i + 9}`,
			{
				key: `Level${i + 9}`,
				playerSpawnX: 96,
				playerSpawnY: 288,
				mapData: createRoom(15, 9),
				tileSize: 64,
				initialSpellWorkflow: {
					nodes: [
						{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Output' } },
					],
					edges: [],
				},
			},
		])
	),

	// Level 11 - 折射初探（基础赋值与时空预判）
	// 地形说明: 0=空地, 1=墙, 5=红色压力板, 6=黄色压力板
	Level11: {
		key: 'Level11',
		playerSpawnX: 150,
		playerSpawnY: 300,
		tileSize: 64,
		mapData: [
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
			[1, 0, 5, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
			[1, 0, 6, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1-left',
				description: 'Task 1: Hit target with 30° deflection (y=30, delay=400ms)',
				type: 'defeat',
			},
			{
				id: 'task2-right',
				description: 'Task 2: Hit target with -30° deflection (y=-30, delay=800ms)',
				type: 'defeat',
				prerequisite: 'task1-left',
			},
			{
				id: 'task3-cover',
				description: 'Task 3: Hit target with 15° deflection (y=15, delay=600ms)',
				type: 'defeat',
				prerequisite: 'task2-right',
			},
		],
		initialSpellWorkflow: {
			nodes: [
				{
					id: 'output-1',
					type: 'output',
					position: { x: 600, y: 250 },
					data: { label: 'Output' },
				},
				{
					id: 'func-deflect',
					type: 'dynamicFunction',
					position: { x: 340, y: 230 },
					data: {
						functionName: 'game::deflectAfterTime',
						displayName: 'deflectAfterTime',
						namespace: 'game',
						params: ['angle', 'delayMs'],
					},
				},
				{ id: 'lit-angle', type: 'literal', position: { x: 100, y: 200 }, data: { value: 30 } },
				{ id: 'lit-delay', type: 'literal', position: { x: 100, y: 280 }, data: { value: 400 } },
			],
			edges: [
				{ id: 'e1', source: 'func-deflect', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'lit-angle', target: 'func-deflect', targetHandle: 'arg0' },
				{ id: 'e3', source: 'lit-delay', target: 'func-deflect', targetHandle: 'arg1' },
			],
		},
	},

	// 批量生成 Level 12-20 (占位)
	...Object.fromEntries(
		Array.from({ length: 9 }, (_, i) => [
			`Level${i + 12}`,
			{
				key: `Level${i + 12}`,
				playerSpawnX: 96,
				playerSpawnY: 288,
				mapData: createRoom(15, 9),
				tileSize: 64,
				initialSpellWorkflow: {
					nodes: [
						{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Output' } },
					],
					edges: [],
				},
			},
		])
	),
}

export function getSceneConfig(sceneKey: string) {
	return SCENE_CONFIGS[sceneKey]
}

export function updateSceneConfig(sceneKey: string, updates: Partial<SceneConfig>) {
	const config = SCENE_CONFIGS[sceneKey]
	if (config) {
		Object.assign(config, updates)
	}
}

export function getPlayerSpawnPosition(sceneKey: string) {
	const cfg = getSceneConfig(sceneKey)
	return cfg ? { x: cfg.playerSpawnX, y: cfg.playerSpawnY } : { x: 200, y: 270 }
}
