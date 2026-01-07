import Phaser from 'phaser'

/**
 * SettingsInterface - Game settings interface
 * Placeholder for future implementation
 */
export class SettingsInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'SettingsInterface' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// Title
		this.add.text(480, 80, 'SETTINGS', {
			fontSize: '48px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		// Placeholder content
		const options = [
			'Volume: 50%',
			'Difficulty: Normal',
			'Controls: WASD',
		]

		options.forEach((opt, i) => {
			this.add.text(480, 200 + i * 50, opt, {
				fontSize: '24px',
				color: '#aaaaaa',
			}).setOrigin(0.5)
		})

		// Back button
		const backBtn = this.add.rectangle(480, 450, 200, 50, 0x8b4513)
		backBtn.setStrokeStyle(2, 0xcd853f)
		backBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 450, 'BACK', {
			fontSize: '20px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		backBtn.on('pointerover', () => backBtn.setFillStyle(0xab6523))
		backBtn.on('pointerout', () => backBtn.setFillStyle(0x8b4513))
		backBtn.on('pointerdown', () => this.scene.start('MainInterface'))
	}
}
