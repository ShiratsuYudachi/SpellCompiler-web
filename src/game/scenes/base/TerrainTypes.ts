/**
 * 地形类型定义
 */

export enum TerrainType {
	EMPTY = 0,     // 空地
	WALL = 1,      // 墙壁（实心碰撞）
	PLATFORM = 2,  // 平台（可跳上）
	HAZARD = 3,    // 危险区（扣血）
	OBJECTIVE = 4, // 目标点（任务点）
}

export interface ObjectiveConfig {
	id: string
	description: string
	type: 'collect' | 'defeat' | 'spell' | 'reach'
	target?: any
	completed?: boolean
	prerequisite?: string // 前置任务ID（完成此任务后才显示）
	visible?: boolean // 是否可见
}

export interface TerrainStyle {
	color: number
	alpha?: number
	strokeColor?: number
	strokeWidth?: number
}

export const TERRAIN_STYLES: Record<TerrainType, TerrainStyle> = {
	[TerrainType.EMPTY]: { color: 0x000000, alpha: 0 },
	[TerrainType.WALL]: { color: 0x3e4a59, strokeColor: 0x5a6a79, strokeWidth: 2 },
	[TerrainType.PLATFORM]: { color: 0x4a7c59, strokeColor: 0x6a9c79, strokeWidth: 2 },
	[TerrainType.HAZARD]: { color: 0x8b3a3a, alpha: 0.8, strokeColor: 0xff0000, strokeWidth: 2 },
	[TerrainType.OBJECTIVE]: { color: 0x3a8b3a, alpha: 0.6, strokeColor: 0x00ff00, strokeWidth: 3 },
}
