import Phaser from 'phaser'

/**
 * MainInterface - Main menu interface (pure UI)
 */
export class MainInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'MainInterface' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// Title
		this.add.text(480, 150, 'SPELL COMPILER', {
			fontSize: '64px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		// Subtitle
		this.add.text(480, 220, 'A Magical Journey', {
			fontSize: '24px',
			color: '#aaaaaa',
		}).setOrigin(0.5)

		// Start game button
		const startBtn = this.add.rectangle(480, 320, 300, 60, 0x4a90e2)
		startBtn.setStrokeStyle(3, 0x5aa0f2)
		startBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 320, 'START GAME', {
			fontSize: '28px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

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

		// Settings button
		const settingsBtn = this.add.rectangle(480, 400, 300, 50, 0x2d3748)
		settingsBtn.setStrokeStyle(2, 0x4a90e2)
		settingsBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 400, 'SETTINGS', {
			fontSize: '22px',
			color: '#ffffff',
		}).setOrigin(0.5)

		settingsBtn.on('pointerover', () => settingsBtn.setFillStyle(0x3d4758))
		settingsBtn.on('pointerout', () => settingsBtn.setFillStyle(0x2d3748))
		settingsBtn.on('pointerdown', () => {
			this.scene.start('SettingsInterface')
		})

		// Instruction text
		this.add.text(480, 470, 'Press TAB to open spell editor in levels', {
			fontSize: '16px',
			color: '#666666',
		}).setOrigin(0.5)

		// Version info
		this.add.text(20, 520, 'v1.0.0', {
			fontSize: '14px',
			color: '#444444',
		})
	}
}
