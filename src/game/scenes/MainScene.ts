import Phaser from 'phaser'

/**
 * MainScene - 主菜单界面（纯UI，不继承BaseScene）
 */
export class MainScene extends Phaser.Scene {
	constructor() {
		super({ key: 'MainScene' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// 标题
		this.add
			.text(480, 150, 'SPELL COMPILER', {
				fontSize: '64px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		// 副标题
		this.add
			.text(480, 220, 'A Magical Journey', {
				fontSize: '24px',
				color: '#aaaaaa',
			})
			.setOrigin(0.5)

		// 开始游戏按钮
		const startBtn = this.add.rectangle(480, 320, 300, 60, 0x4a90e2)
		startBtn.setStrokeStyle(3, 0x5aa0f2)
		startBtn.setInteractive({ useHandCursor: true })

		const startText = this.add
			.text(480, 320, 'START GAME', {
				fontSize: '28px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		startBtn.on('pointerover', () => {
			startBtn.setFillStyle(0x5aa0f2)
			startBtn.setScale(1.05)
		})
		startBtn.on('pointerout', () => {
			startBtn.setFillStyle(0x4a90e2)
			startBtn.setScale(1)
		})
		startBtn.on('pointerdown', () => {
			this.scene.start('LevelSelectScene')
		})

		// 说明文字
		this.add
			.text(480, 450, 'Press TAB to open spell editor in levels', {
				fontSize: '16px',
				color: '#666666',
			})
			.setOrigin(0.5)

		// 版本信息
		this.add
			.text(20, 520, 'v1.0.0', {
				fontSize: '14px',
				color: '#444444',
			})
	}
}
