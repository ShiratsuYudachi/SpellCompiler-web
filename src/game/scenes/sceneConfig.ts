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
		editorRestrictions: /^game::teleportRelative$/,
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

	// 批量生成 Level 7-20
	...Object.fromEntries(
		Array.from({ length: 14 }, (_, i) => [
			`Level${i + 7}`,
			{
				key: `Level${i + 7}`,
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

export function getPlayerSpawnPosition(sceneKey: string) {
	const cfg = getSceneConfig(sceneKey)
	return cfg ? { x: cfg.playerSpawnX, y: cfg.playerSpawnY } : { x: 200, y: 270 }
}
