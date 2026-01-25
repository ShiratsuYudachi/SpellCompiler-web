import type Phaser from 'phaser'
import type { Spell } from '../editor/ast/ast'

// REMOVED: InputState - no longer needed, using Event System for all input
// REMOVED: TriggerType, TriggerConfig - migrated to Event System

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
	spellMessageByEid: Map<number, string>
	// REMOVED: spellByEid - spells are now managed by Event System via spellId
	// REMOVED: input - use Event System instead
	// REMOVED: triggers - use Event System instead
	// REMOVED: triggerIdCounter
	score?: number // Optional score for scenes that use it
	mana?: number // Optional mana for scenes that use it
	// 压力板和感应器状态
	currentPlateColor: PlateColor        // 当前踩踏的压力板颜色
	sensorState: boolean                 // 感应器状态（true=未被遮挡）
	pressurePlates: PressurePlateInfo[]  // 所有压力板
	sensors: SensorInfo[]                // 所有感应器
	// 关卡特定数据
	levelData?: Record<string, any>      // 关卡特定的数据存储（如收集的物品等）
	// 墙体碰撞组（用于火球碰撞检测）
	walls: Phaser.GameObjects.Rectangle[] // 所有墙体
}

