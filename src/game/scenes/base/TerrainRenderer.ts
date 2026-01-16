/**
 * TerrainRenderer - 地形渲染器
 * 使用Graphics绘制带边框的几何体
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
	 * 渲染墙壁
	 */
	renderWall(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.WALL]
		const g = this.scene.add.graphics()

		// 填充
		g.fillStyle(style.color, 1)
		g.fillRect(x - size / 2 + 1, y - size / 2 + 1, size - 2, size - 2)

		// 边框
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 1, y - size / 2 + 1, size - 2, size - 2)
		}

		return g
	}

	/**
	 * 渲染平台
	 */
	renderPlatform(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PLATFORM]
		const g = this.scene.add.graphics()
		const height = 12

		// 填充
		g.fillStyle(style.color, 1)
		g.fillRect(x - size / 2 + 1, y - height / 2, size - 2, height)

		// 边框
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 1, y - height / 2, size - 2, height)
		}

		// 顶部高光
		g.lineStyle(1, 0x8adc8a, 0.6)
		g.lineBetween(x - size / 2 + 2, y - height / 2 + 1, x + size / 2 - 2, y - height / 2 + 1)

		return g
	}

	/**
	 * 渲染危险区
	 */
	renderHazard(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.HAZARD]
		const g = this.scene.add.graphics()

		// 填充
		g.fillStyle(style.color, style.alpha || 0.8)
		g.fillRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4)

		// 边框（内发光）
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 0.8)
			g.strokeRect(x - size / 2 + 2, y - size / 2 + 2, size - 4, size - 4)
		}

		// 警告图案（对角线）
		g.lineStyle(2, 0xff4444, 0.4)
		g.lineBetween(x - size / 3, y - size / 3, x + size / 3, y + size / 3)
		g.lineBetween(x - size / 3, y + size / 3, x + size / 3, y - size / 3)

		return g
	}

	/**
	 * 渲染目标点
	 */
	renderObjective(x: number, y: number, size: number): Phaser.GameObjects.Arc {
		const style = TERRAIN_STYLES[TerrainType.OBJECTIVE]
		const marker = this.scene.add.circle(x, y, size / 3, style.color, style.alpha)
		marker.setStrokeStyle(style.strokeWidth!, style.strokeColor!)
		marker.setDepth(10)

		// 脉动动画
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
	 * 渲染红色压力板
	 */
	renderPressurePlateRed(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PRESSURE_PLATE_RED]
		const g = this.scene.add.graphics()
		const plateHeight = size / 4

		// 底座
		g.fillStyle(0x661111, 1)
		g.fillRect(x - size / 2 + 4, y - plateHeight / 2 + 4, size - 8, plateHeight)

		// 压力板表面
		g.fillStyle(style.color, style.alpha || 0.9)
		g.fillRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)

		// 边框
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)
		}

		// 中心标记
		g.fillStyle(0xff6666, 1)
		g.fillCircle(x, y, 6)

		return g
	}

	/**
	 * 渲染黄色压力板
	 */
	renderPressurePlateYellow(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.PRESSURE_PLATE_YELLOW]
		const g = this.scene.add.graphics()
		const plateHeight = size / 4

		// 底座
		g.fillStyle(0x666611, 1)
		g.fillRect(x - size / 2 + 4, y - plateHeight / 2 + 4, size - 8, plateHeight)

		// 压力板表面
		g.fillStyle(style.color, style.alpha || 0.9)
		g.fillRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)

		// 边框
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 2 + 6, y - plateHeight / 2, size - 12, plateHeight - 4)
		}

		// 中心标记
		g.fillStyle(0xffff66, 1)
		g.fillCircle(x, y, 6)

		return g
	}

	/**
	 * 渲染感应器
	 */
	renderSensor(x: number, y: number, size: number): Phaser.GameObjects.Graphics {
		const style = TERRAIN_STYLES[TerrainType.SENSOR]
		const g = this.scene.add.graphics()

		// 感应器底座
		g.fillStyle(0x222244, 1)
		g.fillRect(x - size / 4, y - size / 2 + 4, size / 2, size - 8)

		// 感应器面板
		g.fillStyle(style.color, style.alpha || 0.7)
		g.fillRect(x - size / 4 + 4, y - size / 2 + 8, size / 2 - 8, size - 16)

		// 边框
		if (style.strokeColor) {
			g.lineStyle(style.strokeWidth!, style.strokeColor, 1)
			g.strokeRect(x - size / 4 + 4, y - size / 2 + 8, size / 2 - 8, size - 16)
		}

		// 感应光束指示
		g.fillStyle(0x00ffff, 0.8)
		g.fillCircle(x, y, 4)

		return g
	}

	destroy() {
		this.graphics.destroy()
	}
}
