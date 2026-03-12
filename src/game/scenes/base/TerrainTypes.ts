/**
 * Terrain type definitions
 */

export enum TerrainType {
	EMPTY = 0,     // Empty
	WALL = 1,      // Wall (solid collision)
	PLATFORM = 2,  // Platform (can jump on)
	HAZARD = 3,    // Hazard (damage)
	OBJECTIVE = 4, // Objective (task point)
	PRESSURE_PLATE_RED = 5,    // Red pressure plate
	PRESSURE_PLATE_YELLOW = 6, // Yellow pressure plate
	SENSOR = 7,    // Sensor
}

export interface ObjectiveConfig {
	id: string
	description: string
	type: 'collect' | 'defeat' | 'spell' | 'reach'
	target?: any
	completed?: boolean
	prerequisite?: string // Prerequisite objective ID (shown after completed)
	visible?: boolean // Whether visible
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
	[TerrainType.PRESSURE_PLATE_RED]: { color: 0xcc3333, alpha: 0.9, strokeColor: 0xff0000, strokeWidth: 3 },
	[TerrainType.PRESSURE_PLATE_YELLOW]: { color: 0xcccc33, alpha: 0.9, strokeColor: 0xffff00, strokeWidth: 3 },
	[TerrainType.SENSOR]: { color: 0x3366cc, alpha: 0.7, strokeColor: 0x00aaff, strokeWidth: 2 },
}
