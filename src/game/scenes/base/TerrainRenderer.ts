/**
 * TerrainRenderer - Terrain renderer
 * Uses Graphics to draw bordered shapes
 */

import Phaser from 'phaser'
import { TerrainType, TERRAIN_STYLES } from './TerrainTypes'

export class TerrainRenderer {
	private scene: Phaser.Scene
	private graphics: Phaser.GameObjects.Graphics

	constructor(scene: Phaser.Scene) {
		this.scene = scene
		this.graphics = scene.add.graphics()
	}

	/**
	 * Render wall
	 */
	renderWall(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.WALL]
		const g = this.scene.add.graphics()

		// Fill
		g.fillStyle(style.color, 1)
		g.fillRect(x - size / 2 + 1, y - size / 2 + 1, size - 2, size - 2)

		// Stroke
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 1, y - size / 2 + 1, size - 2, size - 2)
		}

		return g
	}

	/**
	 * Render platform
	 */
	renderPlatform(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PLATFORM]
		const g = this.scene.add.graphics()
		const height = 12

		// Fill
		g.fillStyle(style.color, 1)
		g.fillRect(x - size / 2 + 1, y - height / 2, size - 2, height)

		// Stroke
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 1, y - height / 2, size - 2, height)
		}

		// Top highlight
		g.lineStyle(1, 0x8adc8a, 0.6)
		g.lineBetween(x - size / 2 + 2, y - height / 2 + 1, x + size / 2 - 2, y - height / 2 + 1)

		return g
	}

	/**
	 * Render hazard zone
	 */
	renderHazard(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.HAZARD]
		const g = this.scene.add.graphics()

		// Fill
		g.fillStyle(style.color, style.alpha || 0.8)
		g.fillRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4)

		// Stroke (inner glow)
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 0.8)
			g.strokeRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4)
		}

		// Warning pattern (diagonal)
		g.lineStyle(2, 0xff4444, 0.4)
		g.lineBetween(x - size / 3, y - size / 3, x + size / 3, y + size / 3)
		g.lineBetween(x - size / 3, y + size / 3, x + size / 3, y - size / 3)

		return g
	}

	/**
	 * Render objective point
	 */
	renderObjective(x: number, y: number, size: number): Phaser.GameObjects.Arc {
		const style = TERRAIN_STYLES[TerrainType.OBJECTIVE]
		const marker = this.scene.add.circle(x, y, size / 3, style.color, style.alpha)
		marker.setStrokeStyle(style.strokeWidth!, style.strokeColor!)
		marker.setDepth(10)

		// Pulse animation
		this.scene.tweens.add({
			targets: marker,
			scale: 1.2,
			alpha: 0.8,
			duration: 1000,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut',
		})

		return marker
	}

	/**
	 * Render red pressure plate
	 */
	renderPressurePlateRed(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PRESSURE_PLATE_RED]
		const g = this.scene.add.graphics()
		const plateHeight = size / 4

		// Base
		g.fillStyle(0x661111, 1)
		g.fillRect(x - size / 2 + 4, y - plateHeight / 2 + 4, size - 8, plateHeight)

		// Plate surface
		g.fillStyle(style.color, style.alpha || 0.9)
		g.fillRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)

		// Stroke
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)
		}

		// Center mark
		g.fillStyle(0xff6666, 1)
		g.fillCircle(x, y, 6)

		return g
	}

	/**
	 * Render yellow pressure plate
	 */
	renderPressurePlateYellow(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PRESSURE_PLATE_YELLOW]
		const g = this.scene.add.graphics()
		const plateHeight = size / 4

		// Base
		g.fillStyle(0x666611, 1)
		g.fillRect(x - size / 2 + 4, y - plateHeight / 2 + 4, size - 8, plateHeight)

		// Plate surface
		g.fillStyle(style.color, style.alpha || 0.9)
		g.fillRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)

		// Stroke
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)
		}

		// Center mark
		g.fillStyle(0xffff66, 1)
		g.fillCircle(x, y, 6)

		return g
	}

	/**
	 * Render sensor
	 */
	renderSensor(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.SENSOR]
		const g = this.scene.add.graphics()

		// Sensor base
		g.fillStyle(0x222244, 1)
		g.fillRect(x - size / 4, y - size / 2 + 4, size / 2, size - 8)

		// Sensor panel
		g.fillStyle(style.color, style.alpha || 0.7)
		g.fillRect(x - size / 4 + 4, y - size / 2 + 8, size / 2 - 8, size - 16)

		// Stroke
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 4 + 4, y - size / 2 + 8, size / 2 - 8, size - 16)
		}

		// Beam indicator
		g.fillStyle(0x00ffff, 0.8)
		g.fillCircle(x, y, 4)

		return g
	}

	destroy() {
		this.graphics.destroy()
	}
}
