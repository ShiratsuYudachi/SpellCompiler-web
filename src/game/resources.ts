import type Phaser from 'phaser'

// REMOVED: InputState - no longer needed, using Event System for all input
// REMOVED: TriggerType, TriggerConfig - migrated to Event System

/**
 * text
 */
export type PlateColor = 'NONE' | 'RED' | 'YELLOW'

/**
 * text
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
 * text
 */
export interface SensorInfo {
	x: number
	y: number
	width: number
	height: number
	active: boolean  // text(text)
	rect: Phaser.GameObjects.Rectangle
}

export type GameResources = {
	scene: Phaser.Scene
	bodies: Map<number, Phaser.Physics.Arcade.Image>
	playerEid: number
	spellMessageByEid: Map<number, string>
	// REMOVED: spellByEid - spells are now managed by Event System via spellId
	// REMOVED: input - use Event System instead
	// REMOVED: triggers - use Event System instead
	// REMOVED: triggerIdCounter
	score?: number // Optional score for scenes that use it
	// pressure plateandtext
	currentPlateColor: PlateColor        // text
	sensorState: boolean                 // text(true=text)
	pressurePlates: PressurePlateInfo[]  // text
	sensors: SensorInfo[]                // text
	// text
	levelData?: Record<string, any>      // text(text)
	// text(text)
	walls: Phaser.GameObjects.Rectangle[] // text
}

