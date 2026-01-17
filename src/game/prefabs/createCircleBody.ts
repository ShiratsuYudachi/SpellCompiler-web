import type Phaser from 'phaser'

export function createCircleBody(
	scene: Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
	key: string,
	color: number,
	radius: number,
	x: number,
	y: number,
	depth: number,
) {
	if (!scene.textures.exists(key)) {
		const g = scene.add.graphics()
		g.fillStyle(color, 1)
		g.fillCircle(radius, radius, radius)
		g.generateTexture(key, radius * 2, radius * 2)
		g.destroy()
	}

	const body = scene.physics.add.image(x, y, key)
	body.setDepth(depth)
	// Set circular body
	body.body.setCircle(radius)
	return body
}
