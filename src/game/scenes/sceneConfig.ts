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
	hints?: string[]
	logicReference?: Record<string, { gridX: number; gridY: number; action: string }>
}

// 快速生成围墙房间
function createRoom(w: number, h: number): number[][] {
	return Array.from({ length: h }, (_, y) =>
		Array.from({ length: w }, (_, x) => (x === 0 || x === w - 1 || y === 0 || y === h - 1 ? 1 : 0))
	)
}

export const SCENE_CONFIGS: Record<string, SceneConfig> = {
	// Level 1 - Transport
	Level1: {
		key: 'Level1',
		playerSpawnX: 120,
		playerSpawnY: 270,
		editorRestrictions: /^(game::teleportRelative|game::getPlayer)$/,
		allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction'],
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

	// Level 6 - Treasure Detection
	Level6: {
		key: 'Level6',
		playerSpawnX: 200,
		playerSpawnY: 270,
		mapData: createRoom(15, 9),
		tileSize: 64,
		editorRestrictions: /^(game::detectTreasure)$/,
		allowedNodeTypes: ['output', 'literal', 'dynamicFunction', 'if'],
		objectives: [
			{
				id: 'find-treasure',
				description: 'Use detectTreasure to find the chest containing treasure and avoid bombs',
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

	// Level 8 - Sorting Challenge with Variable Storage
	Level8: {
		key: 'Level8',
		playerSpawnX: 200,
		playerSpawnY: 300,
		mapData: createRoom(15, 9),
		tileSize: 64,
		// Allow only storage functions, measureWeight, comparison operators, and logic
		editorRestrictions: /^(game::measureWeight|game::setSlot|game::getSlot|game::clearSlots|std::cmp::.*|std::logic::.*)$/,
		// Allow necessary node types including 'if' for decision making
		allowedNodeTypes: ['output', 'dynamicFunction', 'literal', 'if'],
		objectives: [
			{
				id: 'complete-sort',
				description: 'Sort all 4 balls by weight and throw them to gates in ascending order (lightest to heaviest)',
				type: 'defeat',
			},
		],
		// Simple initial spell: measureWeight -> output (will be blocked by anti-cheat)
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
				{
					id: 'func-measureWeight',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'game::measureWeight',
						displayName: 'measureWeight',
						namespace: 'game',
						params: [],
					},
				},
			],
			edges: [],
		},
	},

	// Level 9 - Light Synchronization Challenge
	Level9: {
		key: 'Level9',
		playerSpawnX: 96,
		playerSpawnY: 288,
		mapData: createRoom(15, 9),
		tileSize: 64,
		editorRestrictions: /^(game::getLightColor|game::teleportRelative|game::getPlayer)$/,
		allowedNodeTypes: ['output', 'literal', 'vector', 'dynamicFunction', 'if'],
		objectives: [
			{
				id: 'reach-goal',
				description: 'Reach the goal point',
				type: 'reach',
			},
		],
		initialSpellWorkflow: {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 600, y: 250 }, data: { label: 'Output' } },
				{
					id: 'if-check',
					type: 'if',
					position: { x: 400, y: 250 },
					data: {},
				},
				{
					id: 'func-eq',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},
				{
					id: 'func-getLightColor1',
					type: 'dynamicFunction',
					position: { x: 50, y: 150 },
					data: {
						functionName: 'game::getLightColor',
						displayName: 'getLightColor',
						namespace: 'game',
						params: ['id'],
					},
				},
				{
					id: 'func-getLightColor2',
					type: 'dynamicFunction',
					position: { x: 50, y: 250 },
					data: {
						functionName: 'game::getLightColor',
						displayName: 'getLightColor',
						namespace: 'game',
						params: ['id'],
					},
				},
				{ id: 'lit-id1', type: 'literal', position: { x: -100, y: 150 }, data: { value: 1 } },
				{ id: 'lit-id2', type: 'literal', position: { x: -100, y: 250 }, data: { value: 2 } },
				{
					id: 'func-teleport',
					type: 'dynamicFunction',
					position: { x: 200, y: 350 },
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
					position: { x: 50, y: 400 },
					data: {
						functionName: 'game::getPlayer',
						displayName: 'getPlayer',
						namespace: 'game',
						params: [],
					},
				},
				{ id: 'lit-dx', type: 'literal', position: { x: 50, y: 480 }, data: { value: 50 } },
				{ id: 'lit-dy', type: 'literal', position: { x: 50, y: 550 }, data: { value: 0 } },
				{ id: 'lit-else', type: 'literal', position: { x: 200, y: 150 }, data: { value: 0 } },
			],
			edges: [
				{ id: 'e1', source: 'if-check', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'func-eq', target: 'if-check', targetHandle: 'condition' },
				{ id: 'e3', source: 'func-getLightColor1', target: 'func-eq', targetHandle: 'arg0' },
				{ id: 'e4', source: 'func-getLightColor2', target: 'func-eq', targetHandle: 'arg1' },
				{ id: 'e5', source: 'lit-id1', target: 'func-getLightColor1', targetHandle: 'arg0' },
				{ id: 'e6', source: 'lit-id2', target: 'func-getLightColor2', targetHandle: 'arg0' },
				{ id: 'e7', source: 'func-teleport', target: 'if-check', targetHandle: 'then' },
				{ id: 'e8', source: 'func-getPlayer', target: 'func-teleport', targetHandle: 'arg0' },
				{ id: 'e9', source: 'lit-dx', target: 'func-teleport', targetHandle: 'arg1' },
				{ id: 'e10', source: 'lit-dy', target: 'func-teleport', targetHandle: 'arg2' },
				{ id: 'e11', source: 'lit-else', target: 'if-check', targetHandle: 'else' },
			],
		},
	},

	// Level 10 (placeholder)
	...Object.fromEntries(
		Array.from({ length: 1 }, (_, i) => [
			`Level${i + 10}`,
			{
				key: `Level${i + 10}`,
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
	// 封闭实验室：玩家在左侧，三道高墙将目标分隔开
	// 玩家需要通过计算偏转角度和延迟来击中墙后的目标
	Level11: {
		key: 'Level11',
		playerSpawnX: 96,
		playerSpawnY: 288,
		tileSize: 64,
		mapData: [
			// 15列 x 9行 = 960x576
			// 设计：玩家区(3列) | 第一墙(1列+过道) | 区域1 | 第二墙 | 区域2 | 第三墙 | 区域3
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 墙上方有过道
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // 第一墙有缺口(过道)
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 玩家水平线
			[1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // 第二墙有缺口
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
			[1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // 墙下方有过道
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1-corridor',
				description: 'Task 1: Deflect 30° up through corridor (delay=400ms)',
				type: 'defeat',
			},
			{
				id: 'task2-deep',
				description: 'Task 2: Deflect -30° down to deep target (delay=800ms)',
				type: 'defeat',
				prerequisite: 'task1-corridor',
			},
			{
				id: 'task3-cover',
				description: 'Task 3: Deflect 15° to hit shielded target (delay=600ms)',
				type: 'defeat',
				prerequisite: 'task2-deep',
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

	// Level 12 - 安全分流（If-Else 条件分支）
	// 地形说明: 走廊中央有红色压力板，正前方有磁能盾（代码中创建）
	// Task 1: 左侧绕后 - 踩红板时向上偏转绕过盾牌
	// Task 2: 右侧绕后 - 踩红板时向下偏转绕过盾牌
	// Task 3: 走位分流 - 两发子弹，一发踩板一发不踩
	Level12: {
		key: 'Level12',
		playerSpawnX: 96,
		playerSpawnY: 288,
		tileSize: 64,
		mapData: [
			// 15列 x 9行
			// 走廊设计：玩家区 | 红板 | 空间 | 盾牌位置(代码创建) | 目标区
			// 关键设计：上下方向封闭，强制玩家只能从中间发射
			// 盾牌是中空的，子弹从中间穿过后再偏转
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 上方封闭，目标区开放
			[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 上方封闭
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 中间走廊
			[1, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 红板在玩家前方，中间走廊
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 中间走廊
			[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 下方封闭
			[1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1], // 下方封闭，目标区开放
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1-left',
				description: 'Task 1: Stand on RED, deflect -35° to hit LEFT target',
				type: 'defeat',
			},
			{
				id: 'task2-right',
				description: 'Task 2: Stand on RED, deflect 35° to hit RIGHT target',
				type: 'defeat',
				prerequisite: 'task1-left',
			},
			{
				id: 'task3-split',
				description: 'Task 3: Split test - one code, hit BOTH targets',
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
					id: 'func-conditional',
					type: 'dynamicFunction',
					position: { x: 300, y: 230 },
					data: {
						functionName: 'game::conditionalDeflectOnPlate',
						displayName: 'conditionalDeflectOnPlate',
						namespace: 'game',
						params: ['plateColor', 'trueAngle', 'falseAngle', 'delayMs'],
					},
				},
				{ id: 'lit-red', type: 'literal', position: { x: 50, y: 150 }, data: { value: 'RED' } },
				{ id: 'lit-angle-deflect', type: 'literal', position: { x: 50, y: 220 }, data: { value: -35 } },
				{ id: 'lit-angle-straight', type: 'literal', position: { x: 50, y: 290 }, data: { value: 0 } },
				{ id: 'lit-delay', type: 'literal', position: { x: 50, y: 360 }, data: { value: 500 } },
			],
			edges: [
				{ id: 'e1', source: 'func-conditional', target: 'output-1', targetHandle: 'value' },
				{ id: 'e2', source: 'lit-red', target: 'func-conditional', targetHandle: 'arg0' },
				{ id: 'e3', source: 'lit-angle-deflect', target: 'func-conditional', targetHandle: 'arg1' },
				{ id: 'e4', source: 'lit-angle-straight', target: 'func-conditional', targetHandle: 'arg2' },
				{ id: 'e5', source: 'lit-delay', target: 'func-conditional', targetHandle: 'arg3' },
			],
		},
	},

	// Level 13 - 多重制导（Else-If 多分支）
	// 火球路径设计（根据用户草图）：
	// T1: RED触发 → 向上偏转 → 击中T1（红板上方）
	// T2: RED不触发 → 向右下飞 → YELLOW不触发 → 继续飞 → 击中T2（右上）
	// T3: RED不触发 → 向右下飞 → YELLOW触发 → 向右上偏转(V字形) → 击中T3（黄板右侧）
	Level13: {
		key: 'Level13',
		playerSpawnX: 96,
		playerSpawnY: 192,
		tileSize: 64,
		mapData: [
			// 15列 x 9行 = 960x576
			// 0=空地, 1=墙, 5=红色压力板, 6=黄色压力板
			// 根据用户草图：玩家左侧，红板在玩家右边，T1在红板上方
			// 中间有通道向右下延伸到黄板，T2在右上，T3在黄板旁
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1], // T1区域(左上), T2区域(右上)
			[1, 0, 0, 0, 5, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1], // RED压力板, 右侧墙壁阻挡
			[1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 1], // 通道开始向右下
			[1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], //
			[1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1], //
			[1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1], //
			[1, 1, 1, 1, 1, 1, 1, 1, 6, 0, 0, 1, 1, 1, 1], // YELLOW压力板, T3在右侧
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1-red-up',
				description: 'Task 1: IF fireball on RED -> deflect UP (-45°)',
				type: 'defeat',
			},
			{
				id: 'task2-straight',
				description: 'Task 2: ELSE IF fireball on YELLOW -> do nothing, hit T2',
				type: 'defeat',
				prerequisite: 'task1-red-up',
			},
			{
				id: 'task3-yellow-vshape',
				description: 'Task 3: ELSE IF fireball on YELLOW -> deflect UP (-60°) for V-shape',
				type: 'defeat',
				prerequisite: 'task2-straight',
			},
		],
		initialSpellWorkflow: {
			nodes: [
				// === 主输出 ===
				{ id: 'output-1', type: 'output', position: { x: 1100, y: 300 }, data: { label: 'Output' } },

				// === onTrigger 包装器 - 让法术在火球飞行期间持续执行 ===
				{
					id: 'func-onTrigger',
					type: 'dynamicFunction',
					position: { x: 900, y: 280 },
					data: {
						functionName: 'game::onTrigger',
						displayName: 'onTrigger',
						namespace: 'game',
						params: ['triggerType', 'condition', 'action'],
					},
				},

				// Trigger Type: "onFireballFlying"
				{ id: 'lit-triggerType', type: 'triggerType', position: { x: 700, y: 200 }, data: { triggerType: 'onFireballFlying' } },

				// Trigger Condition: 50 (检测间隔 ms)
				{ id: 'lit-interval', type: 'literal', position: { x: 700, y: 280 }, data: { value: 50 } },

				// === Lambda 定义 - 包含 if-else 逻辑 ===
				{
					id: 'lambda-action',
					type: 'lambdaDef',
					position: { x: 700, y: 380 },
					data: { functionName: 'checkPlate', params: [] },
				},

				// Lambda 返回节点
				{ id: 'lambda-return', type: 'functionOut', position: { x: 500, y: 380 }, data: { lambdaId: 'lambda-action' } },

				// === If-Else 逻辑（在 Lambda 内部）===

				// 外层 If 节点 - 检测 RED 压力板
				{ id: 'if-outer', type: 'if', position: { x: 300, y: 360 }, data: {} },

				// 内层 If 节点 - 检测 YELLOW 压力板 (嵌套在外层的 else 分支)
				{ id: 'if-inner', type: 'if', position: { x: 100, y: 480 }, data: {} },

				// getFireballPlateColor 函数 - 用于外层条件
				{
					id: 'func-getPlate-outer',
					type: 'dynamicFunction',
					position: { x: -300, y: 230 },
					data: {
						functionName: 'game::getFireballPlateColor',
						displayName: 'getFireballPlateColor',
						namespace: 'game',
						params: [],
					},
				},

				// getFireballPlateColor 函数 - 用于内层条件
				{
					id: 'func-getPlate-inner',
					type: 'dynamicFunction',
					position: { x: -300, y: 430 },
					data: {
						functionName: 'game::getFireballPlateColor',
						displayName: 'getFireballPlateColor',
						namespace: 'game',
						params: [],
					},
				},

				// 比较函数 - 外层: getFireballPlateColor() == "RED"
				{
					id: 'func-eq-red',
					type: 'dynamicFunction',
					position: { x: -100, y: 250 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},

				// 比较函数 - 内层: getFireballPlateColor() == "YELLOW"
				{
					id: 'func-eq-yellow',
					type: 'dynamicFunction',
					position: { x: -100, y: 450 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},

				// Literal: "RED"
				{ id: 'lit-red', type: 'literal', position: { x: -300, y: 310 }, data: { value: 'RED' } },

				// Literal: "YELLOW"
				{ id: 'lit-yellow', type: 'literal', position: { x: -300, y: 510 }, data: { value: 'YELLOW' } },

				// deflectOnPlate("RED", -45) - Task 1: 在红板向上偏转
				{
					id: 'func-deflect-red',
					type: 'dynamicFunction',
					position: { x: 100, y: 230 },
					data: {
						functionName: 'game::deflectOnPlate',
						displayName: 'deflectOnPlate',
						namespace: 'game',
						params: ['plateColor', 'angle'],
					},
				},

				// Literal: "RED" for deflectOnPlate
				{ id: 'lit-red-deflect', type: 'literal', position: { x: -50, y: 160 }, data: { value: 'RED' } },

				// Literal: -45 (向上偏转角度)
				{ id: 'lit-angle-up', type: 'literal', position: { x: -50, y: 220 }, data: { value: -45 } },

				// deflectOnPlate("YELLOW", -60) - Task 3: 在黄板V字形偏转
				{
					id: 'func-deflect-yellow',
					type: 'dynamicFunction',
					position: { x: -100, y: 580 },
					data: {
						functionName: 'game::deflectOnPlate',
						displayName: 'deflectOnPlate',
						namespace: 'game',
						params: ['plateColor', 'angle'],
					},
				},

				// Literal: "YELLOW" for deflectOnPlate
				{ id: 'lit-yellow-deflect', type: 'literal', position: { x: -250, y: 580 }, data: { value: 'YELLOW' } },

				// Literal: -60 (V字形偏转角度)
				{ id: 'lit-angle-vshape', type: 'literal', position: { x: -250, y: 640 }, data: { value: -60 } },

				// Literal: true - Task 2: 直行不偏转
				{ id: 'lit-true', type: 'literal', position: { x: -100, y: 700 }, data: { value: true } },
			],
			edges: [
				// === 主输出连接 ===
				{ id: 'e-output', source: 'func-onTrigger', target: 'output-1', targetHandle: 'value' },

				// === onTrigger 参数连接 ===
				{ id: 'e-trigger-type', source: 'lit-triggerType', target: 'func-onTrigger', targetHandle: 'arg0' },
				{ id: 'e-trigger-interval', source: 'lit-interval', target: 'func-onTrigger', targetHandle: 'arg1' },
				{ id: 'e-trigger-action', source: 'lambda-return', sourceHandle: 'function', target: 'func-onTrigger', targetHandle: 'arg2' },

				// === Lambda 返回值连接 ===
				{ id: 'e-lambda-return', source: 'if-outer', target: 'lambda-return', targetHandle: 'value' },

				// === 外层 If 连接 ===
				// 条件: getFireballPlateColor() == "RED"
				{ id: 'e-outer-cond', source: 'func-eq-red', target: 'if-outer', targetHandle: 'condition' },
				// then: deflectOnPlate("RED", -45)
				{ id: 'e-outer-then', source: 'func-deflect-red', target: 'if-outer', targetHandle: 'then' },
				// else: 内层 if
				{ id: 'e-outer-else', source: 'if-inner', target: 'if-outer', targetHandle: 'else' },

				// === 外层条件: getFireballPlateColor() == "RED" ===
				{ id: 'e-eq-red-a', source: 'func-getPlate-outer', target: 'func-eq-red', targetHandle: 'arg0' },
				{ id: 'e-eq-red-b', source: 'lit-red', target: 'func-eq-red', targetHandle: 'arg1' },

				// === deflectOnPlate("RED", -45) 参数 ===
				{ id: 'e-deflect-red-color', source: 'lit-red-deflect', target: 'func-deflect-red', targetHandle: 'arg0' },
				{ id: 'e-deflect-red-angle', source: 'lit-angle-up', target: 'func-deflect-red', targetHandle: 'arg1' },

				// === 内层 If 连接 ===
				// 条件: getFireballPlateColor() == "YELLOW"
				{ id: 'e-inner-cond', source: 'func-eq-yellow', target: 'if-inner', targetHandle: 'condition' },
				// then: deflectOnPlate("YELLOW", -60)
				{ id: 'e-inner-then', source: 'func-deflect-yellow', target: 'if-inner', targetHandle: 'then' },
				// else: true (直行)
				{ id: 'e-inner-else', source: 'lit-true', target: 'if-inner', targetHandle: 'else' },

				// === 内层条件: getFireballPlateColor() == "YELLOW" ===
				{ id: 'e-eq-yellow-a', source: 'func-getPlate-inner', target: 'func-eq-yellow', targetHandle: 'arg0' },
				{ id: 'e-eq-yellow-b', source: 'lit-yellow', target: 'func-eq-yellow', targetHandle: 'arg1' },

				// === deflectOnPlate("YELLOW", -60) 参数 ===
				{ id: 'e-deflect-yellow-color', source: 'lit-yellow-deflect', target: 'func-deflect-yellow', targetHandle: 'arg0' },
				{ id: 'e-deflect-yellow-angle', source: 'lit-angle-vshape', target: 'func-deflect-yellow', targetHandle: 'arg1' },
			],
		},
	},

	// Level 14 - 精密验证（AND 复合条件）
	Level14: {
		key: 'Level14',
		playerSpawnX: 150,
		playerSpawnY: 288,
		tileSize: 64,
		mapData: [
			// 0=空地, 1=墙, 5=红色压力板, 6=黄色压力板, 7=感应器
			// 玩家在 y=288 (第4行中间)，火球向右水平飞行
			// 红色压力板放在第4行，让火球能经过
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Task1 目标区域（上方）
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 红色压力板在玩家发射路径上 (y=4*64+32=288)
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
			[1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 黄色压力板在下方
			[1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // Task2 目标区域（下方）
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'task1-red-sensor',
				description: 'Task 1: RED plate AND sensor ON -> deflect 45°',
				type: 'defeat',
			},
			{
				id: 'task2-yellow-sensor',
				description: 'Task 2: YELLOW plate AND sensor OFF -> deflect -45°',
				type: 'defeat',
				prerequisite: 'task1-red-sensor',
			},
			{
				id: 'task3-complex',
				description: 'Task 3: Combined logic with timing',
				type: 'defeat',
				prerequisite: 'task2-yellow-sensor',
			},
		],
		initialSpellWorkflow: {
			nodes: [
				// === 主输出 ===
				{ id: 'output-1', type: 'output', position: { x: 1100, y: 300 }, data: { label: 'Output' } },

				// === onTrigger 包装器 - 让法术在火球飞行期间持续执行 ===
				{
					id: 'func-onTrigger',
					type: 'dynamicFunction',
					position: { x: 900, y: 280 },
					data: {
						functionName: 'game::onTrigger',
						displayName: 'onTrigger',
						namespace: 'game',
						params: ['triggerType', 'condition', 'action'],
					},
				},

				// Trigger Type: "onFireballFlying"
				{ id: 'lit-triggerType', type: 'triggerType', position: { x: 700, y: 200 }, data: { triggerType: 'onFireballFlying' } },

				// Trigger Condition: 50 (检测间隔 ms)
				{ id: 'lit-interval', type: 'literal', position: { x: 700, y: 280 }, data: { value: 50 } },

				// === Lambda 定义 - 包含检测逻辑 ===
				{
					id: 'lambda-action',
					type: 'lambdaDef',
					position: { x: 700, y: 380 },
					data: { functionName: 'checkPlate', params: [] },
				},

				// Lambda 返回节点
				{ id: 'lambda-return', type: 'functionOut', position: { x: 500, y: 380 }, data: { lambdaId: 'lambda-action' } },

				// === If 节点 - 检测 RED 压力板 ===
				{ id: 'if-red', type: 'if', position: { x: 300, y: 360 }, data: {} },

				// getFireballPlateColor 函数
				{
					id: 'func-getPlate',
					type: 'dynamicFunction',
					position: { x: -200, y: 250 },
					data: {
						functionName: 'game::getFireballPlateColor',
						displayName: 'getFireballPlateColor',
						namespace: 'game',
						params: [],
					},
				},

				// 比较函数: getFireballPlateColor() == "RED"
				{
					id: 'func-eq-red',
					type: 'dynamicFunction',
					position: { x: 0, y: 270 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},

				// Literal: "RED"
				{ id: 'lit-red', type: 'literal', position: { x: -200, y: 330 }, data: { value: 'RED' } },

				// deflectAfterTime(-45, 0) - 检测到红板时立即向上偏转 45°
				{
					id: 'func-deflect',
					type: 'dynamicFunction',
					position: { x: 100, y: 200 },
					data: {
						functionName: 'game::deflectAfterTime',
						displayName: 'deflectAfterTime',
						namespace: 'game',
						params: ['angle', 'delayMs'],
					},
				},

				// Literal: -45 (向上偏转角度)
				{ id: 'lit-angle', type: 'literal', position: { x: -50, y: 150 }, data: { value: -45 } },

				// Literal: 0 (立即偏转，无延迟)
				{ id: 'lit-delay', type: 'literal', position: { x: -50, y: 220 }, data: { value: 0 } },

				// Literal: true - else 分支不做任何事
				{ id: 'lit-true', type: 'literal', position: { x: 100, y: 450 }, data: { value: true } },
			],
			edges: [
				// === 主输出连接 ===
				{ id: 'e-output', source: 'func-onTrigger', target: 'output-1', targetHandle: 'value' },

				// === onTrigger 参数连接 ===
				{ id: 'e-trigger-type', source: 'lit-triggerType', target: 'func-onTrigger', targetHandle: 'arg0' },
				{ id: 'e-trigger-interval', source: 'lit-interval', target: 'func-onTrigger', targetHandle: 'arg1' },
				{ id: 'e-trigger-action', source: 'lambda-return', sourceHandle: 'function', target: 'func-onTrigger', targetHandle: 'arg2' },

				// === Lambda 返回值连接 ===
				{ id: 'e-lambda-return', source: 'if-red', target: 'lambda-return', targetHandle: 'value' },

				// === If 连接 ===
				// 条件: getFireballPlateColor() == "RED"
				{ id: 'e-if-cond', source: 'func-eq-red', target: 'if-red', targetHandle: 'condition' },
				// then: deflectAfterTime(-45, 0)
				{ id: 'e-if-then', source: 'func-deflect', target: 'if-red', targetHandle: 'then' },
				// else: true (不偏转)
				{ id: 'e-if-else', source: 'lit-true', target: 'if-red', targetHandle: 'else' },

				// === 条件: getFireballPlateColor() == "RED" ===
				{ id: 'e-eq-red-a', source: 'func-getPlate', target: 'func-eq-red', targetHandle: 'arg0' },
				{ id: 'e-eq-red-b', source: 'lit-red', target: 'func-eq-red', targetHandle: 'arg1' },

				// === deflectAfterTime(-45, 0) 参数 ===
				{ id: 'e-deflect-angle', source: 'lit-angle', target: 'func-deflect', targetHandle: 'arg0' },
				{ id: 'e-deflect-delay', source: 'lit-delay', target: 'func-deflect', targetHandle: 'arg1' },
			],
		},
	},

	// Level 15 - 多重制导挑战（Else-If 多分支进阶）
	// 地形与 Level13 类似，但任务目标不同
	// T1: 红板触发 → 向上偏转 → 击中 T1 (4,1)
	// T2: 黄板触发 → 向右偏转 → 击中 T2 (10,7)
	// T3: 红黄双重偏转 → 击中 T3 (12,1)
	Level15: {
		key: 'Level15',
		playerSpawnX: 96,
		playerSpawnY: 96,
		tileSize: 64,
		mapData: [
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 0, 0, 0, 0, 0, 5, 1, 6, 0, 0, 0, 0, 0, 1],
			[1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
			[1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
			[1, 1, 6, 0, 0, 0, 0, 0, 5, 0, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
			[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
		],
		objectives: [
			{
				id: 'T1',
				description: 'Task 1: Angled Rebound — Use the first RED plate to perform an angled rebound and land on the yellow plate in the diagonal corridor.',
				type: 'defeat',
			},
			{
				id: 'T2',
				description: 'Task 2: Vertical Ascent — Use the second RED plate to flatten then immediately ascend through the narrow vertical channel.',
				type: 'defeat',
				prerequisite: 'T1',
			},
			{
				id: 'T3',
				description: 'Task 3: Final Strike — Use the final YELLOW plate to complete the turn and destroy the target at the end of the corridor.',
				type: 'defeat',
				prerequisite: 'T2',
			},
		],
		hints: [
			"Core challenge: you will pass RED and YELLOW plates twice; you must distinguish the trigger order.",
			"Programming tip: use a variable `stage = 1`. After each plate hit, increment `stage`.",
			"Logic example: if (color === 'RED' && stage === 1) { ... } else if (color === 'RED' && stage === 3) { ... }",
		],
		logicReference: {
			redPlate1: { gridX: 6, gridY: 1, action: 'Deflect down-left (225°)' },
			yellowPlate1: { gridX: 2, gridY: 5, action: 'Deflect right (0°)' },
			redPlate2: { gridX: 8, gridY: 5, action: 'Deflect upward (-90°)' },
			yellowPlate2: { gridX: 8, gridY: 1, action: 'Deflect down-right (45°)' },
		},
		initialSpellWorkflow: {
			nodes: [
				// === 主输出 ===
				{ id: 'output-1', type: 'output', position: { x: 1100, y: 300 }, data: { label: 'Output' } },

				// === onTrigger 包装器 - 让法术在火球飞行期间持续执行 ===
				{
					id: 'func-onTrigger',
					type: 'dynamicFunction',
					position: { x: 900, y: 280 },
					data: {
						functionName: 'game::onTrigger',
						displayName: 'onTrigger',
						namespace: 'game',
						params: ['triggerType', 'condition', 'action'],
					},
				},

				// Trigger Type: "onFireballFlying"
				{ id: 'lit-triggerType', type: 'triggerType', position: { x: 700, y: 200 }, data: { triggerType: 'onFireballFlying' } },

				// Trigger Condition: 50 (检测间隔 ms)
				{ id: 'lit-interval', type: 'literal', position: { x: 700, y: 280 }, data: { value: 50 } },

				// === Lambda 定义 - 包含 if-else 逻辑 ===
				{
					id: 'lambda-action',
					type: 'lambdaDef',
					position: { x: 700, y: 380 },
					data: { functionName: 'checkPlate', params: [] },
				},

				// Lambda 返回节点
				{ id: 'lambda-return', type: 'functionOut', position: { x: 500, y: 380 }, data: { lambdaId: 'lambda-action' } },

				// === If-Else 逻辑（在 Lambda 内部）===

				// 外层 If 节点 - 检测 RED 压力板
				{ id: 'if-outer', type: 'if', position: { x: 300, y: 360 }, data: {} },

				// 内层 If 节点 - 检测 YELLOW 压力板 (嵌套在外层的 else 分支)
				{ id: 'if-inner', type: 'if', position: { x: 100, y: 480 }, data: {} },

				// getFireballPlateColor 函数 - 用于外层条件
				{
					id: 'func-getPlate-outer',
					type: 'dynamicFunction',
					position: { x: -300, y: 230 },
					data: {
						functionName: 'game::getFireballPlateColor',
						displayName: 'getFireballPlateColor',
						namespace: 'game',
						params: [],
					},
				},

				// getFireballPlateColor 函数 - 用于内层条件
				{
					id: 'func-getPlate-inner',
					type: 'dynamicFunction',
					position: { x: -300, y: 430 },
					data: {
						functionName: 'game::getFireballPlateColor',
						displayName: 'getFireballPlateColor',
						namespace: 'game',
						params: [],
					},
				},

				// 比较函数 - 外层: getFireballPlateColor() == "RED"
				{
					id: 'func-eq-red',
					type: 'dynamicFunction',
					position: { x: -100, y: 250 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},

				// 比较函数 - 内层: getFireballPlateColor() == "YELLOW"
				{
					id: 'func-eq-yellow',
					type: 'dynamicFunction',
					position: { x: -100, y: 450 },
					data: {
						functionName: 'std::cmp::eq',
						displayName: '== equals',
						namespace: 'std',
						params: ['a', 'b'],
					},
				},

				// Literal: "RED"
				{ id: 'lit-red', type: 'literal', position: { x: -300, y: 310 }, data: { value: 'RED' } },

				// Literal: "YELLOW"
				{ id: 'lit-yellow', type: 'literal', position: { x: -300, y: 510 }, data: { value: 'YELLOW' } },

				// deflectOnPlate("RED", -45) - Task 1: 在红板向上偏转
				{
					id: 'func-deflect-red',
					type: 'dynamicFunction',
					position: { x: 100, y: 230 },
					data: {
						functionName: 'game::deflectOnPlate',
						displayName: 'deflectOnPlate',
						namespace: 'game',
						params: ['plateColor', 'angle'],
					},
				},

				// Literal: "RED" for deflectOnPlate
				{ id: 'lit-red-deflect', type: 'literal', position: { x: -50, y: 160 }, data: { value: 'RED' } },

				// Literal: -45 (向上偏转角度)
				{ id: 'lit-angle-up', type: 'literal', position: { x: -50, y: 220 }, data: { value: -45 } },

				// deflectOnPlate("YELLOW", -60) - Task 2/3: 在黄板偏转
				{
					id: 'func-deflect-yellow',
					type: 'dynamicFunction',
					position: { x: -100, y: 580 },
					data: {
						functionName: 'game::deflectOnPlate',
						displayName: 'deflectOnPlate',
						namespace: 'game',
						params: ['plateColor', 'angle'],
					},
				},

				// Literal: "YELLOW" for deflectOnPlate
				{ id: 'lit-yellow-deflect', type: 'literal', position: { x: -250, y: 580 }, data: { value: 'YELLOW' } },

				// Literal: -60 (偏转角度)
				{ id: 'lit-angle-yellow', type: 'literal', position: { x: -250, y: 640 }, data: { value: -60 } },

				// Literal: true - else 分支不偏转
				{ id: 'lit-true', type: 'literal', position: { x: -100, y: 700 }, data: { value: true } },
			],
			edges: [
				// === 主输出连接 ===
				{ id: 'e-output', source: 'func-onTrigger', target: 'output-1', targetHandle: 'value' },

				// === onTrigger 参数连接 ===
				{ id: 'e-trigger-type', source: 'lit-triggerType', target: 'func-onTrigger', targetHandle: 'arg0' },
				{ id: 'e-trigger-interval', source: 'lit-interval', target: 'func-onTrigger', targetHandle: 'arg1' },
				{ id: 'e-trigger-action', source: 'lambda-return', sourceHandle: 'function', target: 'func-onTrigger', targetHandle: 'arg2' },

				// === Lambda 返回值连接 ===
				{ id: 'e-lambda-return', source: 'if-outer', target: 'lambda-return', targetHandle: 'value' },

				// === 外层 If 连接 ===
				// 条件: getFireballPlateColor() == "RED"
				{ id: 'e-outer-cond', source: 'func-eq-red', target: 'if-outer', targetHandle: 'condition' },
				// then: deflectOnPlate("RED", -45)
				{ id: 'e-outer-then', source: 'func-deflect-red', target: 'if-outer', targetHandle: 'then' },
				// else: 内层 if
				{ id: 'e-outer-else', source: 'if-inner', target: 'if-outer', targetHandle: 'else' },

				// === 外层条件: getFireballPlateColor() == "RED" ===
				{ id: 'e-eq-red-a', source: 'func-getPlate-outer', target: 'func-eq-red', targetHandle: 'arg0' },
				{ id: 'e-eq-red-b', source: 'lit-red', target: 'func-eq-red', targetHandle: 'arg1' },

				// === deflectOnPlate("RED", -45) 参数 ===
				{ id: 'e-deflect-red-color', source: 'lit-red-deflect', target: 'func-deflect-red', targetHandle: 'arg0' },
				{ id: 'e-deflect-red-angle', source: 'lit-angle-up', target: 'func-deflect-red', targetHandle: 'arg1' },

				// === 内层 If 连接 ===
				// 条件: getFireballPlateColor() == "YELLOW"
				{ id: 'e-inner-cond', source: 'func-eq-yellow', target: 'if-inner', targetHandle: 'condition' },
				// then: deflectOnPlate("YELLOW", -60)
				{ id: 'e-inner-then', source: 'func-deflect-yellow', target: 'if-inner', targetHandle: 'then' },
				// else: true (直行)
				{ id: 'e-inner-else', source: 'lit-true', target: 'if-inner', targetHandle: 'else' },

				// === 内层条件: getFireballPlateColor() == "YELLOW" ===
				{ id: 'e-eq-yellow-a', source: 'func-getPlate-inner', target: 'func-eq-yellow', targetHandle: 'arg0' },
				{ id: 'e-eq-yellow-b', source: 'lit-yellow', target: 'func-eq-yellow', targetHandle: 'arg1' },

				// === deflectOnPlate("YELLOW", -60) 参数 ===
				{ id: 'e-deflect-yellow-color', source: 'lit-yellow-deflect', target: 'func-deflect-yellow', targetHandle: 'arg0' },
				{ id: 'e-deflect-yellow-angle', source: 'lit-angle-yellow', target: 'func-deflect-yellow', targetHandle: 'arg1' },
			],
		},
	},

	// 批量生成 Level 16-20 (占位)
	...Object.fromEntries(
		Array.from({ length: 5 }, (_, i) => [
			`Level${i + 16}`,
			{
				key: `Level${i + 16}`,
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
