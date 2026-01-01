import Phaser from 'phaser'

export function createRectBody(
	scene: Phaser.Scene,
	key: string,
	color: number,
	w: number,
	h: number,
	x: number,
	y: number,
	depth: number,
) {
	if (!scene.textures.exists(key)) {
		const g = scene.add.graphics()
		g.fillStyle(color, 1)
		g.fillRect(0, 0, w, h)
		g.generateTexture(key, w, h)
		g.destroy()
	}

	const body = scene.physics.add.image(x, y, key)
	body.setDepth(depth)
	return body
}



