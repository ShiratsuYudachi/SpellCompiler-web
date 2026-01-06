import Phaser from 'phaser'
import { LevelProgress } from './base/LevelProgress'

/**
 * LevelSelectScene - 关卡选择界面
 * 支持滚动、关卡解锁、进度显示
 */
export class LevelSelectScene extends Phaser.Scene {
	private container!: Phaser.GameObjects.Container
	private scrollY = 0
	private maxScrollY = 0
	private isDragging = false
	private dragStartY = 0
	private dragStartScrollY = 0

	constructor() {
		super({ key: 'LevelSelectScene' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// 标题（固定）
		this.add
			.text(480, 40, 'SELECT LEVEL', {
				fontSize: '32px',
				color: '#ffffff',
				fontStyle: 'bold',
			})
			.setOrigin(0.5)
			.setScrollFactor(0)

		// 可滚动容器
		this.container = this.add.container(0, 80)

		// 关卡映射配置
		const levelMapping = [
			{ num: 1, sceneKey: 'Level1', name: 'Puzzle' },
			{ num: 2, sceneKey: 'Level2', name: 'Boss Battle' },
			{ num: 3, sceneKey: 'Level3', name: 'Combat' },
		]

		// 生成20关（4列5行）
		const totalLevels = 20
		const cols = 4
		const rows = Math.ceil(totalLevels / cols)
		const startX = 180
		const startY = 20
		const spacingX = 200
		const spacingY = 130

		for (let i = 0; i < totalLevels; i++) {
			const levelNum = i + 1
			const col = i % cols
			const row = Math.floor(i / cols)
			const x = startX + col * spacingX
			const y = startY + row * spacingY

			const mapped = levelMapping.find((m) => m.num === levelNum)
			const sceneKey = mapped ? mapped.sceneKey : `Level${levelNum}`
			const levelName = mapped ? mapped.name : 'Empty'
			const isUnlocked = LevelProgress.isLevelUnlocked(levelNum)
			const isCompleted = LevelProgress.isLevelCompleted(levelNum)

			// 按钮容器
			const btnGroup = this.add.container(x, y)

			// 关卡按钮
			const btn = this.add.rectangle(0, 0, 140, 100, isUnlocked ? 0x2d3748 : 0x1a1f2e)
			btn.setStrokeStyle(2, isUnlocked ? 0x4a90e2 : 0x3a3f4e)

			// 关卡号
			const numText = this.add
				.text(0, -20, `${levelNum}`, {
					fontSize: '32px',
					color: isUnlocked ? '#ffffff' : '#555555',
					fontStyle: 'bold',
				})
				.setOrigin(0.5)

			// 关卡名
			const nameText = this.add
				.text(0, 20, levelName, {
					fontSize: '14px',
					color: isUnlocked ? '#aaaaaa' : '#444444',
				})
				.setOrigin(0.5)

			btnGroup.add([btn, numText, nameText])

			// 已完成标记
			if (isCompleted) {
				const checkmark = this.add
					.text(50, -40, '✓', {
						fontSize: '24px',
						color: '#00ff00',
					})
					.setOrigin(0.5)
				btnGroup.add(checkmark)
			}

			if (isUnlocked) {
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
					.text(0, 5, '🔒', {
						fontSize: '32px',
					})
					.setOrigin(0.5)
				lockText.setAlpha(0.4)
				btnGroup.add(lockText)
			}

			this.container.add(btnGroup)
		}

		// 计算最大滚动距离
		this.maxScrollY = Math.max(0, rows * spacingY + 40 - 400) // 400 = 可视区域高度

		// 滚动条（如果需要）
		if (this.maxScrollY > 0) {
			this.createScrollbar()
		}

		// 返回主菜单按钮（固定在底部）
		const backBtn = this.add.rectangle(480, 520, 200, 50, 0x8b4513).setScrollFactor(0)
		backBtn.setStrokeStyle(2, 0xcd853f)
		backBtn.setInteractive({ useHandCursor: true })

		const backText = this.add
			.text(480, 520, 'BACK TO MENU', {
				fontSize: '18px',
				color: '#ffffff',
			})
			.setOrigin(0.5)
			.setScrollFactor(0)

		backBtn.on('pointerover', () => backBtn.setFillStyle(0xab6523))
		backBtn.on('pointerout', () => backBtn.setFillStyle(0x8b4513))
		backBtn.on('pointerdown', () => this.scene.start('MainScene'))

		// 解锁提示（开发模式）
		this.add
			.text(480, 510, 'Press U to unlock all levels (dev)', {
				fontSize: '10px',
				color: '#666666',
			})
			.setOrigin(0.5)
			.setScrollFactor(0)

		// 设置拖动滚动
		this.setupDragScroll()

		// 快捷键
		this.input.keyboard?.on('keydown-U', () => {
			LevelProgress.unlockAll()
			this.scene.restart()
		})

		this.input.keyboard?.on('keydown-R', () => {
			LevelProgress.reset()
			this.scene.restart()
		})
	}

	private createScrollbar() {
		const scrollbar = this.add.rectangle(930, 270, 8, 400, 0x333333, 0.5).setScrollFactor(0)
		const scrollHandle = this.add.rectangle(930, 120, 12, 60, 0x666666).setScrollFactor(0)

		this.data.set('scrollbar', scrollbar)
		this.data.set('scrollHandle', scrollHandle)
	}

	private updateScrollbar() {
		const scrollHandle = this.data.get('scrollHandle') as Phaser.GameObjects.Rectangle
		if (!scrollHandle) return

		const progress = this.scrollY / this.maxScrollY
		const handleY = 120 + progress * 340
		scrollHandle.setY(handleY)
	}

	private setupDragScroll() {
		this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			if (this.maxScrollY <= 0) return
			this.isDragging = true
			this.dragStartY = pointer.y
			this.dragStartScrollY = this.scrollY
		})

		this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
			if (!this.isDragging) return

			const deltaY = pointer.y - this.dragStartY
			this.scrollY = Phaser.Math.Clamp(this.dragStartScrollY - deltaY, 0, this.maxScrollY)
			this.container.setY(80 - this.scrollY)
			this.updateScrollbar()
		})

		this.input.on('pointerup', () => {
			this.isDragging = false
		})

		// 鼠标滚轮
		this.input.on('wheel', (pointer: any, gameObjects: any, deltaX: number, deltaY: number) => {
			if (this.maxScrollY <= 0) return

			this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY)
			this.container.setY(80 - this.scrollY)
			this.updateScrollbar()
		})
	}
}
