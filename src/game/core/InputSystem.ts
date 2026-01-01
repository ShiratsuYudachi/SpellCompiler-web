import Phaser from 'phaser'

export class InputSystem {
	private cursors: Phaser.Types.Input.Keyboard.CursorKeys
	private keys: Record<string, Phaser.Input.Keyboard.Key>
	private attackKey: Phaser.Input.Keyboard.Key

	constructor(scene: Phaser.Scene) {
		this.cursors = scene.input.keyboard!.createCursorKeys()
		this.keys = scene.input.keyboard!.addKeys('W,A,S,D') as Record<string, Phaser.Input.Keyboard.Key>
		this.attackKey = scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
	}

	getMoveAxis() {
		let x = 0
		let y = 0

		if (this.cursors.left?.isDown || this.keys.A.isDown) x -= 1
		if (this.cursors.right?.isDown || this.keys.D.isDown) x += 1
		if (this.cursors.up?.isDown || this.keys.W.isDown) y -= 1
		if (this.cursors.down?.isDown || this.keys.S.isDown) y += 1

		if (x !== 0 || y !== 0) {
			const len = Math.sqrt(x * x + y * y)
			x /= len
			y /= len
		}

		return { x, y }
	}

	isAttackPressed() {
		return Phaser.Input.Keyboard.JustDown(this.attackKey)
	}
}

