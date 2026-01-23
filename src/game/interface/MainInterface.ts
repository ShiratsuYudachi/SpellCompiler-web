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

	// Test Scene button (NEW!)
	const testBtn = this.add.rectangle(480, 465, 300, 50, 0xe2904a)
	testBtn.setStrokeStyle(2, 0xf2aa5a)
	testBtn.setInteractive({ useHandCursor: true })

	this.add.text(480, 465, 'TEST SCENE', {
		fontSize: '22px',
		color: '#ffffff',
		fontStyle: 'bold',
	}).setOrigin(0.5)

	// Badge: NEW
	this.add.text(640, 450, 'NEW', {
		fontSize: '12px',
		color: '#ffff00',
		fontStyle: 'bold',
		backgroundColor: '#ff4400',
		padding: { x: 5, y: 2 },
	}).setOrigin(0.5)

	testBtn.on('pointerover', () => {
		testBtn.setFillStyle(0xf2aa5a)
		testBtn.setScale(1.02)
	})
	testBtn.on('pointerout', () => {
		testBtn.setFillStyle(0xe2904a)
		testBtn.setScale(1)
	})
	testBtn.on('pointerdown', () => {
		this.scene.start('TestScene')
	})

	// Instruction text
	this.add.text(480, 512, 'Press TAB to open spell editor in levels', {
		fontSize: '14px',
		color: '#666666',
	}).setOrigin(0.5)

	// Version info
	this.add.text(20, 520, 'v1.0.0 - Stage 1', {
		fontSize: '14px',
		color: '#444444',
	})
	}
}
