import Phaser from 'phaser'
import {
	menuButtonLabelStyle,
	menuFooterHintStyle,
	menuMainTitleStyle,
	menuSubtitleStyle,
	menuVersionStyle,
} from '../ui/inGameTextStyle'
import { drawArcaneMenuBackground } from '../ui/menuVisuals'

/**
 * MainInterface - Main menu interface (pure UI)
 */
export class MainInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'MainInterface' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		drawArcaneMenuBackground(this)

		// Title
		this.add.text(480, 150, 'SPELL COMPILER', menuMainTitleStyle()).setOrigin(0.5)

		// Subtitle
		this.add.text(480, 220, 'A Magical Journey', menuSubtitleStyle()).setOrigin(0.5)

		// Start game button
		const startBtn = this.add.rectangle(480, 320, 300, 60, 0x4a90e2)
		startBtn.setStrokeStyle(3, 0x5aa0f2)
		startBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 320, 'START GAME', menuButtonLabelStyle('28px')).setOrigin(0.5)

		startBtn.on('pointerover', () => {
			startBtn.setFillStyle(0x5aa0f2)
			startBtn.setScale(1.05)
		})
		startBtn.on('pointerout', () => {
			startBtn.setFillStyle(0x4a90e2)
			startBtn.setScale(1)
		})
		startBtn.on('pointerdown', () => {
			this.scene.start('LevelSelectInterface')
		})

		// Save Files button
		const saveBtn = this.add.rectangle(480, 395, 300, 50, 0x48bb78)
		saveBtn.setStrokeStyle(2, 0x68d391)
		saveBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 395, 'SAVE FILES', menuButtonLabelStyle('22px')).setOrigin(0.5)

		saveBtn.on('pointerover', () => saveBtn.setFillStyle(0x68d391))
		saveBtn.on('pointerout', () => saveBtn.setFillStyle(0x48bb78))
		saveBtn.on('pointerdown', () => {
			this.scene.start('SaveSelectScene')
		})

		// Instruction text
		this.add.text(480, 480, 'Press TAB to open spell editor in levels', menuFooterHintStyle()).setOrigin(0.5)

		// Version info
		this.add.text(20, 520, 'v1.0.0 - Stage 1', menuVersionStyle())
	}
}
