import type Phaser from 'phaser'
import type { CompiledSpell } from './spells/types'

export type InputState = {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys
	keys: Record<string, Phaser.Input.Keyboard.Key>
	meleeKey: Phaser.Input.Keyboard.Key
	spellKey1: Phaser.Input.Keyboard.Key
}

/**
 * 触发器类型
 */
export type TriggerType = 
	| 'onEnemyNearby'      // 敌人进入指定距离时触发
	| 'onTimeInterval'      // 每隔指定时间触发
	| 'onPlayerHurt'        // 玩家受伤时触发
	| 'onEnemyKilled'       // 敌人被击杀时触发
	| 'onPlayerLowHealth'   // 玩家生命值低于阈值时触发

/**
 * 触发器配置
 */
export interface TriggerConfig {
	id: number
	type: TriggerType
	casterEid: number
	spell: CompiledSpell
	// 条件参数
	params: {
		distance?: number        // onEnemyNearby: 触发距离（像素）
		intervalMs?: number      // onTimeInterval: 间隔时间（毫秒）
		healthThreshold?: number // onPlayerLowHealth: 生命值阈值（0-1）
	}
	// 内部状态
	lastTriggerTime: number     // 上次触发时间（用于时间间隔）
	lastHealth?: number         // 上次生命值（用于检测变化）
	active: boolean             // 是否激活
}

/**
 * 压力板颜色类型
 */
export type PlateColor = 'NONE' | 'RED' | 'YELLOW'

/**
 * 压力板信息
 */
export interface PressurePlateInfo {
	x: number
	y: number
	width: number
	height: number
	color: PlateColor
	rect: Phaser.GameObjects.Rectangle
}

/**
 * 感应器信息
 */
export interface SensorInfo {
	x: number
	y: number
	width: number
	height: number
	active: boolean  // 感应器是否被激活（未被遮挡）
	rect: Phaser.GameObjects.Rectangle
}

export type GameResources = {
	scene: Phaser.Scene
	bodies: Map<number, Phaser.Physics.Arcade.Image>
	playerEid: number
	hudText: Phaser.GameObjects.Text
	spellByEid: Map<number, CompiledSpell>
	spellMessageByEid: Map<number, string>
	input: InputState
	triggers: Map<number, TriggerConfig> // 触发器存储
	triggerIdCounter: number             // 触发器ID计数器
	score?: number // Optional score for scenes that use it
	mana?: number // Optional mana for scenes that use it
	// 压力板和感应器状态
	currentPlateColor: PlateColor        // 当前踩踏的压力板颜色
	sensorState: boolean                 // 感应器状态（true=未被遮挡）
	pressurePlates: PressurePlateInfo[]  // 所有压力板
	sensors: SensorInfo[]                // 所有感应器
	// 关卡特定数据
	levelData?: Record<string, any>      // 关卡特定的数据存储（如收集的物品等）
}

