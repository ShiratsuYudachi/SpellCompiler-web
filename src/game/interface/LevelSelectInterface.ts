import Phaser from 'phaser'
import { LevelProgress } from '../scenes/base/LevelProgress'

// Category color accents
const CATEGORY_COLORS: Record<string, number> = {
	'Basics':     0x4a90e2, // blue
	'Deflection': 0xe2a94a, // orange
	'Filter':     0xa94ae2, // purple
	'forEach':    0x4ae27a, // green
	'map':        0xe24a7a, // pink
	'Spatial':    0x4ae2d0, // teal
	'Combo':      0xe2e24a, // yellow
}

interface LevelEntry {
	num: number
	key: string
	name: string
	category: string
}

/**
 * LevelSelectInterface - Level selection interface
 * Supports scrolling, level unlocking, and progress display
 */
export class LevelSelectInterface extends Phaser.Scene {
	private container!: Phaser.GameObjects.Container
	private scrollY = 0
	private maxScrollY = 0
	private isDragging = false
	private dragStartY = 0
	private dragStartScrollY = 0

	constructor() {
		super({ key: 'LevelSelectInterface' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// Title (fixed)
		this.add.text(480, 40, 'SELECT LEVEL', {
			fontSize: '32px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0)

		// Scrollable container
		this.container = this.add.container(0, 80)

		// ── Full level list (skip missing 5 and 10) ──────────────────────
		const levels: LevelEntry[] = [
			// Chapter 1: Basics
			{ num: 1,  key: 'Level1',  name: 'Move',         category: 'Basics' },
			{ num: 2,  key: 'Level2',  name: 'Attack',       category: 'Basics' },
			{ num: 3,  key: 'Level3',  name: 'Event System', category: 'Basics' },
			{ num: 4,  key: 'Level4',  name: 'Custom Event', category: 'Basics' },
			{ num: 6,  key: 'Level6',  name: 'Treasure Hunt',category: 'Basics' },
			{ num: 7,  key: 'Level7',  name: 'Heavy Ball',   category: 'Basics' },
			{ num: 8,  key: 'Level8',  name: 'Sort & Throw', category: 'Basics' },
			{ num: 9,  key: 'Level9',  name: 'Reach Goal',   category: 'Basics' },
			// Chapter 2: Deflection
			{ num: 11, key: 'Level11', name: 'Deflect I',    category: 'Deflection' },
			{ num: 12, key: 'Level12', name: 'Deflect II',   category: 'Deflection' },
			{ num: 13, key: 'Level13', name: 'Deflect III',  category: 'Deflection' },
			{ num: 14, key: 'Level14', name: 'Logic Gate',   category: 'Deflection' },
			{ num: 15, key: 'Level15', name: 'Angled Rebound',category: 'Deflection' },
			{ num: 16, key: 'Level16', name: 'Boss Battle',  category: 'Deflection' },
			{ num: 17, key: 'Level17', name: 'Combat',       category: 'Deflection' },
			{ num: 18, key: 'Level18', name: 'Conditions',   category: 'Deflection' },
			// Chapter 3: Filter intro
			{ num: 19, key: 'Level19', name: 'Only Red',     category: 'Filter' },
			{ num: 20, key: 'Level20', name: 'Guided Strike',category: 'Filter' },
			{ num: 21, key: 'Level21', name: 'Max Threat',   category: 'Filter' },
			// Chapter 4: forEach
			{ num: 22, key: 'Level22', name: 'Sweep',        category: 'forEach' },
			{ num: 23, key: 'Level23', name: 'Precision',    category: 'forEach' },
			{ num: 24, key: 'Level24', name: 'Strike',       category: 'forEach' },
			// Chapter 5: map
			{ num: 25, key: 'Level25', name: 'Guided Balls', category: 'map' },
			{ num: 26, key: 'Level26', name: 'Reactor',      category: 'map' },
			{ num: 27, key: 'Level27', name: 'Classified',   category: 'map' },
			// Chapter 6: Spatial query
			{ num: 28, key: 'Level28', name: 'Close Sweep',  category: 'Spatial' },
			{ num: 29, key: 'Level29', name: 'Lockdown',     category: 'Spatial' },
			// Chapter 7: Combination
			{ num: 30, key: 'Level30', name: 'Combo I',      category: 'Combo' },
			{ num: 31, key: 'Level31', name: 'Final Trial',  category: 'Combo' },
		]

		const cols = 4
		const startX = 180
		const startY = 20
		const spacingX = 200
		const spacingY = 130
		const rows = Math.ceil(levels.length / cols)

		levels.forEach((entry, i) => {
			const col = i % cols
			const row = Math.floor(i / cols)
			const x = startX + col * spacingX
			const y = startY + row * spacingY

			const isUnlocked = LevelProgress.isLevelUnlocked(entry.num)
			const isCompleted = LevelProgress.isLevelCompleted(entry.num)
			const accentColor = CATEGORY_COLORS[entry.category] ?? 0x4a90e2

			// Button container
			const btnGroup = this.add.container(x, y)

			// Background
			const btn = this.add.rectangle(0, 0, 140, 100, isUnlocked ? 0x2d3748 : 0x1a1f2e)
			btn.setStrokeStyle(2, isUnlocked ? accentColor : 0x3a3f4e)

			// Category accent bar (top of button)
			if (isUnlocked) {
				const accent = this.add.rectangle(0, -47, 136, 4, accentColor, 0.8)
				btnGroup.add(accent)
			}

			// Level number
			const numText = this.add.text(-28, -18, `${entry.num}`, {
				fontSize: '28px',
				color: isUnlocked ? '#ffffff' : '#555555',
				fontStyle: 'bold',
			}).setOrigin(0, 0.5)

			// Level name
			const nameText = this.add.text(0, 22, entry.name, {
				fontSize: '12px',
				color: isUnlocked ? '#aaaaaa' : '#444444',
				wordWrap: { width: 128 },
				align: 'center',
			}).setOrigin(0.5)

			// Category tag
			const catText = this.add.text(42, -28, entry.category, {
				fontSize: '9px',
				color: isUnlocked ? `#${accentColor.toString(16).padStart(6, '0')}` : '#444444',
			}).setOrigin(1, 0.5)

			btnGroup.add([btn, numText, nameText, catText])

			// Completion marker
			if (isCompleted) {
				const checkmark = this.add.text(52, -42, '✓', {
					fontSize: '20px',
					color: '#00ff88',
				}).setOrigin(0.5)
				btnGroup.add(checkmark)
			}

			if (isUnlocked) {
				btn.setInteractive({ useHandCursor: true })
				btn.on('pointerover', () => {
					btn.setFillStyle(0x3d4758)
					btn.setStrokeStyle(3, accentColor)
				})
				btn.on('pointerout', () => {
					btn.setFillStyle(0x2d3748)
					btn.setStrokeStyle(2, accentColor)
				})
				btn.on('pointerdown', () => {
					this.scene.start(entry.key)
				})
			} else {
				const lockText = this.add.text(0, 5, '🔒', {
					fontSize: '28px',
				}).setOrigin(0.5)
				lockText.setAlpha(0.4)
				btnGroup.add(lockText)
			}

			this.container.add(btnGroup)
		})

		// Calculate maximum scroll distance
		this.maxScrollY = Math.max(0, rows * spacingY + 40 - 400)

		// Scrollbar (if needed)
		if (this.maxScrollY > 0) {
			this.createScrollbar()
		}

		// Back to menu button (fixed at bottom)
		const backBtn = this.add.rectangle(480, 520, 200, 50, 0x8b4513).setScrollFactor(0)
		backBtn.setStrokeStyle(2, 0xcd853f)
		backBtn.setInteractive({ useHandCursor: true })

		this.add.text(480, 520, 'BACK TO MENU', {
			fontSize: '18px',
			color: '#ffffff',
		}).setOrigin(0.5).setScrollFactor(0)

		backBtn.on('pointerover', () => backBtn.setFillStyle(0xab6523))
		backBtn.on('pointerout', () => backBtn.setFillStyle(0x8b4513))
		backBtn.on('pointerdown', () => this.scene.start('MainInterface'))

		// Dev hints (small text)
		this.add.text(480, 507, 'U = unlock all  |  R = reset progress', {
			fontSize: '10px',
			color: '#555555',
		}).setOrigin(0.5).setScrollFactor(0)

		// Setup drag scrolling
		this.setupDragScroll()

		// Keyboard shortcuts
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
		this.add.rectangle(930, 270, 8, 400, 0x333333, 0.5).setScrollFactor(0)
		const scrollHandle = this.add.rectangle(930, 120, 12, 60, 0x666666).setScrollFactor(0)
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

		// Mouse wheel
		this.input.on('wheel', (_pointer: any, _gameObjects: any, _deltaX: number, deltaY: number) => {
			if (this.maxScrollY <= 0) return
			this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY)
			this.container.setY(80 - this.scrollY)
			this.updateScrollbar()
		})
	}
}
