import Phaser from 'phaser'
import { SaveManager } from '../../storage/SaveManager'
import type { SaveFileInfo } from '../../storage/types'

/**
 * SaveSelectScene - Save file selection interface
 * Allows players to create, load, and delete save files
 */
export class SaveSelectScene extends Phaser.Scene {
	private container!: Phaser.GameObjects.Container
	private saveItems: Phaser.GameObjects.Container[] = []
	private confirmDialog: Phaser.GameObjects.Container | null = null

	constructor() {
		super({ key: 'SaveSelectScene' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')

		// Title
		this.add.text(480, 50, 'SELECT SAVE FILE', {
			fontSize: '36px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		// Container for save items
		this.container = this.add.container(0, 120)

		// Load and display save files
		this.refreshSaveList()

		// New Save button
		this.createNewSaveButton()

		// Instructions
		this.add.text(480, 650, 'Click to load a save or create a new one', {
			fontSize: '16px',
			color: '#888888',
		}).setOrigin(0.5)
	}

	private refreshSaveList() {
		// Clear existing items
		this.saveItems.forEach(item => item.destroy())
		this.saveItems = []
		this.container.removeAll()

		// Get all saves
		const saves = SaveManager.listAllSaves()

		// Display save items
		const startY = 0
		const spacing = 120

		saves.forEach((save) => {
			const item = this.createSaveItem(save)
			item.y = startY + this.saveItems.length * spacing
			this.container.add(item)
			this.saveItems.push(item)
		})
	}

	private createSaveItem(save: SaveFileInfo): Phaser.GameObjects.Container {
		const container = this.add.container(480, 0)

		// Background
		const bg = this.add.rectangle(0, 0, 600, 100, 0x1a1f2e)
		bg.setStrokeStyle(2, 0x2d3748)
		bg.setInteractive({ useHandCursor: true })
		container.add(bg)

		// Hover effect
		bg.on('pointerover', () => {
			bg.setFillStyle(0x252b3a)
		})
		bg.on('pointerout', () => {
			bg.setFillStyle(0x1a1f2e)
		})

		// Save name
		const shortId = save.id.slice(-4)
		const nameText = this.add.text(-280, -25, `Save #${shortId}`, {
			fontSize: '24px',
			color: '#ffffff',
			fontStyle: 'bold',
		})
		container.add(nameText)

		// Save info
		const timeAgo = this.getTimeAgo(save.lastSaved)
		const infoText = this.add.text(-280, 5, `Level ${save.currentLevel} • Last saved: ${timeAgo}`, {
			fontSize: '14px',
			color: '#888888',
		})
		container.add(infoText)

		// Load button
		const loadBtn = this.add.rectangle(200, 0, 120, 40, 0x4299e1)
		loadBtn.setStrokeStyle(2, 0x63b3ed)
		loadBtn.setInteractive({ useHandCursor: true })
		container.add(loadBtn)

		this.add.text(200, 0, 'LOAD', {
			fontSize: '16px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		
		container.add(this.add.text(200, 0, 'LOAD', {
			fontSize: '16px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5))

		loadBtn.on('pointerover', () => {
			loadBtn.setFillStyle(0x63b3ed)
		})
		loadBtn.on('pointerout', () => {
			loadBtn.setFillStyle(0x4299e1)
		})
		loadBtn.on('pointerdown', () => {
			this.loadSave(save.id)
		})

		// Delete button
		const deleteBtn = this.add.rectangle(250, 30, 80, 30, 0xe53e3e)
		deleteBtn.setStrokeStyle(1, 0xfc8181)
		deleteBtn.setInteractive({ useHandCursor: true })
		container.add(deleteBtn)

		const deleteText = this.add.text(250, 30, 'Delete', {
			fontSize: '12px',
			color: '#ffffff',
		}).setOrigin(0.5)
		container.add(deleteText)

		deleteBtn.on('pointerover', () => {
			deleteBtn.setFillStyle(0xfc8181)
		})
		deleteBtn.on('pointerout', () => {
			deleteBtn.setFillStyle(0xe53e3e)
		})
		deleteBtn.on('pointerdown', () => {
			this.deleteSave(save.id, save.name)
		})

		return container
	}

	private getTimeAgo(timestamp: number): string {
		const seconds = Math.floor((Date.now() - timestamp) / 1000)
		
		let interval = Math.floor(seconds / 31536000)
		if (interval > 1) return interval + " years ago"
		if (interval === 1) return interval + " year ago"
		
		interval = Math.floor(seconds / 2592000)
		if (interval > 1) return interval + " months ago"
		if (interval === 1) return interval + " month ago"
		
		interval = Math.floor(seconds / 86400)
		if (interval > 1) return interval + " days ago"
		if (interval === 1) return interval + " day ago"
		
		interval = Math.floor(seconds / 3600)
		if (interval > 1) return interval + " hours ago"
		if (interval === 1) return interval + " hour ago"
		
		interval = Math.floor(seconds / 60)
		if (interval > 1) return interval + " minutes ago"
		if (interval === 1) return interval + " minute ago"
		
		return Math.floor(seconds) + " seconds ago"
	}

	private createNewSaveButton() {
		const y = 120 + this.saveItems.length * 120 + 60

		const btn = this.add.rectangle(480, y, 300, 60, 0x48bb78)
		btn.setStrokeStyle(3, 0x68d391)
		btn.setInteractive({ useHandCursor: true })

		this.add.text(480, y, '+ NEW SAVE', {
			fontSize: '20px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		btn.on('pointerover', () => {
			btn.setFillStyle(0x68d391)
		})
		btn.on('pointerout', () => {
			btn.setFillStyle(0x48bb78)
		})
		btn.on('pointerdown', () => {
			this.createNewSave()
		})
	}

	private loadSave(id: string) {
		console.log(`[SaveSelectScene] Loading save: ${id}`)
		const save = SaveManager.loadSaveFile(id)
		if (save) {
			// Transition to level select
			this.scene.start('LevelSelectInterface')
		}
	}

	private deleteSave(id: string, saveName: string) {
		// Show confirmation dialog
		this.showConfirmDialog(saveName, () => {
			console.log(`[SaveSelectScene] Deleting save: ${id}`)
			SaveManager.deleteSave(id)
			this.refreshSaveList()
		})
	}

	private createNewSave() {
		// Create a new save with a default name
		const timestamp = new Date().toLocaleString()
		const name = `Save ${timestamp}`
		SaveManager.createNewSave(name)
		console.log(`[SaveSelectScene] Created new save: ${name}`)
		
		// Reload the scene to show the new save
		this.scene.restart()
	}

	/**
	 * Show confirmation dialog for deleting a save
	 */
	private showConfirmDialog(saveName: string, onConfirm: () => void) {
		// Create overlay
		const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7)
		overlay.setInteractive()

		// Create dialog container
		this.confirmDialog = this.add.container(480, 270)

		// Dialog background
		const dialogBg = this.add.rectangle(0, 0, 500, 250, 0x1a1f2e)
		dialogBg.setStrokeStyle(3, 0xe53e3e)
		this.confirmDialog.add(dialogBg)

		// Warning icon
		const warningText = this.add.text(0, -70, '⚠️', {
			fontSize: '48px',
		}).setOrigin(0.5)
		this.confirmDialog.add(warningText)

		// Title
		const title = this.add.text(0, -20, 'Delete Save File?', {
			fontSize: '28px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		this.confirmDialog.add(title)

		// Message
		const message = this.add.text(0, 20, `Are you sure you want to delete "${saveName}"?`, {
			fontSize: '16px',
			color: '#cccccc',
			align: 'center',
			wordWrap: { width: 450 }
		}).setOrigin(0.5)
		this.confirmDialog.add(message)

		const warning = this.add.text(0, 50, 'This action cannot be undone!', {
			fontSize: '14px',
			color: '#ff6b6b',
			fontStyle: 'italic',
		}).setOrigin(0.5)
		this.confirmDialog.add(warning)

		// Cancel button
		const cancelBtn = this.add.rectangle(-100, 100, 150, 45, 0x4a5568)
		cancelBtn.setStrokeStyle(2, 0x718096)
		cancelBtn.setInteractive({ useHandCursor: true })
		this.confirmDialog.add(cancelBtn)

		const cancelText = this.add.text(-100, 100, 'Cancel', {
			fontSize: '18px',
			color: '#ffffff',
		}).setOrigin(0.5)
		this.confirmDialog.add(cancelText)

		cancelBtn.on('pointerover', () => {
			cancelBtn.setFillStyle(0x718096)
		})
		cancelBtn.on('pointerout', () => {
			cancelBtn.setFillStyle(0x4a5568)
		})
		cancelBtn.on('pointerdown', () => {
			this.hideConfirmDialog()
			overlay.destroy()
		})

		// Delete button
		const deleteBtn = this.add.rectangle(100, 100, 150, 45, 0xe53e3e)
		deleteBtn.setStrokeStyle(2, 0xfc8181)
		deleteBtn.setInteractive({ useHandCursor: true })
		this.confirmDialog.add(deleteBtn)

		const deleteText = this.add.text(100, 100, 'Delete', {
			fontSize: '18px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		this.confirmDialog.add(deleteText)

		deleteBtn.on('pointerover', () => {
			deleteBtn.setFillStyle(0xfc8181)
		})
		deleteBtn.on('pointerout', () => {
			deleteBtn.setFillStyle(0xe53e3e)
		})
		deleteBtn.on('pointerdown', () => {
			this.hideConfirmDialog()
			overlay.destroy()
			onConfirm()
		})

		// Bring to front
		this.confirmDialog.setDepth(1000)
	}

	/**
	 * Hide confirmation dialog
	 */
	private hideConfirmDialog() {
		if (this.confirmDialog) {
			this.confirmDialog.destroy()
			this.confirmDialog = null
		}
	}
}
