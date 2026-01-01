import type Phaser from 'phaser'

export function flashBody(
	scene: Phaser.Scene,
	body: Phaser.Physics.Arcade.Image,
	durationMs = 80,
	tint = 0xff4444,
) {
	body.setTint(tint)
	scene.time.delayedCall(durationMs, () => {
		if (body.active) {
			body.clearTint()
		}
	})
}


