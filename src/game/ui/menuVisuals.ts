import Phaser from 'phaser'

/**
 * Single-hue dark background: only near-black grays (no blue/purple bands).
 * Depth below normal UI.
 */
export function drawArcaneMenuBackground(scene: Phaser.Scene): void {
	const w = scene.cameras.main.width
	const h = scene.cameras.main.height

	const g = scene.add.graphics()
	g.setDepth(-10_000)
	g.fillGradientStyle(0x0a0e14, 0x0c1018, 0x080a0e, 0x0a0c12, 1, 1, 1, 1)
	g.fillRect(0, 0, w, h)
}
