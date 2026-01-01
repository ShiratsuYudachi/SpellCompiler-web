import type Phaser from 'phaser'

export function createHud(scene: Phaser.Scene) {
	const hudText = scene.add.text(16, 16, '', {
		fontFamily: 'monospace',
		fontSize: '16px',
		color: '#ffffff',
	})
	hudText.setDepth(100)
	hudText.setScrollFactor(0)
	return hudText
}



