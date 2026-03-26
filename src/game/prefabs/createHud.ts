import type Phaser from 'phaser'
import { hudRootStyle } from '../ui/inGameTextStyle'

export function createHud(scene: Phaser.Scene) {
	const hudText = scene.add.text(16, 16, '', hudRootStyle())
	hudText.setDepth(100)
	hudText.setScrollFactor(0)
	return hudText
}
