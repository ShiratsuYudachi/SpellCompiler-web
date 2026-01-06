import Phaser from 'phaser'

/**
 * LevelSelectScene - 关卡选择界面
 * 显示1-20关，4x5网格布局
 */
export class LevelSelectScene extends Phaser.Scene {
	constructor() {
		super({ key: 'LevelSelectScene' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// 标题
		this.add
			.text(480, 40, 'SELECT LEVEL', {
				fontSize: '32px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)

		// 关卡映射配置
		const levelMapping = [
			{ num: 1, sceneKey: 'Level1', name: 'Puzzle' },
			{ num: 2, sceneKey: 'Level2', name: 'Boss Battle' },
			{ num: 3, sceneKey: 'Level3', name: 'Combat' },
		]

		// 生成20关
		const totalLevels = 20
		const cols = 4
		const rows = 5
		const startX = 180
		const startY = 100
		const spacing = 150

		for (let i = 0; i < totalLevels; i++) {
			const levelNum = i + 1
			const col = i % cols
			const row = Math.floor(i / cols)
			const x = startX + col * spacing
			const y = startY + row * spacing

			// 确定场景key和名称
			const mapped = levelMapping.find((m) => m.num === levelNum)
			const sceneKey = mapped ? mapped.sceneKey : `Level${levelNum}`
			const levelName = mapped ? mapped.name : 'Empty'
			const isAvailable = levelNum <= 3 // 只有前3关可用

			// 关卡按钮
			const btn = this.add.rectangle(x, y, 120, 100, isAvailable ? 0x2d3748 : 0x1a1f2e)
			btn.setStrokeStyle(2, isAvailable ? 0x4a90e2 : 0x3a3f4e)

			// 关卡号
			const numText = this.add
				.text(x, y - 20, `${levelNum}`, {
					fontSize: '28px',
					color: isAvailable ? '#ffffff' : '#555555',
					fontStyle: 'bold',
				})
				.setOrigin(0.5)

			// 关卡名
			const nameText = this.add
				.text(x, y + 20, levelName, {
					fontSize: '14px',
					color: isAvailable ? '#aaaaaa' : '#444444',
				})
				.setOrigin(0.5)

			if (isAvailable) {
				// 可用关卡：添加交互
				btn.setInteractive({ useHandCursor: true })
				btn.on('pointerover', () => {
					btn.setFillStyle(0x3d4758)
					btn.setStrokeStyle(3, 0x5aa0f2)
				})
				btn.on('pointerout', () => {
					btn.setFillStyle(0x2d3748)
					btn.setStrokeStyle(2, 0x4a90e2)
				})
				btn.on('pointerdown', () => {
					this.scene.start(sceneKey)
				})
			} else {
				// 未开放关卡：显示锁定图标
				const lockText = this.add
					.text(x, y + 5, '🔒', {
						fontSize: '32px',
					})
					.setOrigin(0.5)
				lockText.setAlpha(0.4)
			}
		}

		// 返回主菜单按钮
		const backBtn = this.add.rectangle(480, 520, 200, 50, 0x8b4513)
		backBtn.setStrokeStyle(2, 0xcd853f)
		backBtn.setInteractive({ useHandCursor: true })

		const backText = this.add
			.text(480, 520, 'BACK TO MENU', {
				fontSize: '18px',
				color: '#ffffff',
			})
			.setOrigin(0.5)

		backBtn.on('pointerover', () => {
			backBtn.setFillStyle(0xab6523)
		})
		backBtn.on('pointerout', () => {
			backBtn.setFillStyle(0x8b4513)
		})
		backBtn.on('pointerdown', () => {
			this.scene.start('MainScene')
		})
	}
}
