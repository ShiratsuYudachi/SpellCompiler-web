import Phaser from 'phaser'
import { SaveManager } from '../../storage/SaveManager'
import type { SaveFileInfo } from '../../storage/types'
import { LevelProgress } from './base/LevelProgress'
import { eventQueue } from '../events/EventQueue'

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
		this.add.text(480, 650, 'Load a save, create new one, or import/export for backup', {
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
		const bg = this.add.rectangle(0, 0, 700, 100, 0x1a1f2e)
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
		const nameText = this.add.text(-330, -25, `Save #${shortId}`, {
			fontSize: '24px',
			color: '#ffffff',
			fontStyle: 'bold',
		})
		container.add(nameText)

		// Save info
		const timeAgo = this.getTimeAgo(save.lastSaved)
		const infoText = this.add.text(-330, 5, `Level ${save.currentLevel} • Last saved: ${timeAgo}`, {
			fontSize: '14px',
			color: '#888888',
		})
		container.add(infoText)

		// Load button
		const loadBtn = this.add.rectangle(150, -10, 100, 35, 0x4299e1)
		loadBtn.setStrokeStyle(2, 0x63b3ed)
		loadBtn.setInteractive({ useHandCursor: true })
		container.add(loadBtn)

		const loadText = this.add.text(150, -10, 'LOAD', {
			fontSize: '14px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		container.add(loadText)

		loadBtn.on('pointerover', () => {
			loadBtn.setFillStyle(0x63b3ed)
		})
		loadBtn.on('pointerout', () => {
			loadBtn.setFillStyle(0x4299e1)
		})
		loadBtn.on('pointerdown', () => {
			this.loadSave(save.id)
		})

		// Export button
		const exportBtn = this.add.rectangle(260, -10, 100, 35, 0x48bb78)
		exportBtn.setStrokeStyle(2, 0x68d391)
		exportBtn.setInteractive({ useHandCursor: true })
		container.add(exportBtn)

		const exportText = this.add.text(260, -10, 'EXPORT', {
			fontSize: '14px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		container.add(exportText)

		exportBtn.on('pointerover', () => {
			exportBtn.setFillStyle(0x68d391)
		})
		exportBtn.on('pointerout', () => {
			exportBtn.setFillStyle(0x48bb78)
		})
		exportBtn.on('pointerdown', () => {
			this.exportSave(save.id, save.name)
		})

		// Delete button
		const deleteBtn = this.add.rectangle(260, 30, 100, 25, 0xe53e3e)
		deleteBtn.setStrokeStyle(1, 0xfc8181)
		deleteBtn.setInteractive({ useHandCursor: true })
		container.add(deleteBtn)

		const deleteText = this.add.text(260, 30, 'Delete', {
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

		// New Save button
		const newBtn = this.add.rectangle(380, y, 250, 60, 0x48bb78)
		newBtn.setStrokeStyle(3, 0x68d391)
		newBtn.setInteractive({ useHandCursor: true })

		this.add.text(380, y, '+ NEW SAVE', {
			fontSize: '20px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		newBtn.on('pointerover', () => {
			newBtn.setFillStyle(0x68d391)
		})
		newBtn.on('pointerout', () => {
			newBtn.setFillStyle(0x48bb78)
		})
		newBtn.on('pointerdown', () => {
			this.createNewSave()
		})

		// Import Save button
		const importBtn = this.add.rectangle(660, y, 250, 60, 0x9f7aea)
		importBtn.setStrokeStyle(3, 0xb794f4)
		importBtn.setInteractive({ useHandCursor: true })

		this.add.text(660, y, '📥 IMPORT SAVE', {
			fontSize: '20px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)

		importBtn.on('pointerover', () => {
			importBtn.setFillStyle(0xb794f4)
		})
		importBtn.on('pointerout', () => {
			importBtn.setFillStyle(0x9f7aea)
		})
		importBtn.on('pointerdown', () => {
			this.importSaveFromFile()
		})
	}

	private loadSave(id: string) {
		console.log(`[SaveSelectScene] Loading save: ${id}`)
		const save = SaveManager.loadSaveFile(id)
		if (save) {
			// Reload all dependent systems with new save data
			this.reloadGameSystems()
			
			// Transition to level select
			this.scene.start('LevelSelectInterface')
		}
	}

	/**
	 * Reload all game systems that depend on save data
	 */
	private reloadGameSystems() {
		// Reload LevelProgress
		LevelProgress.init()
		
		// Reload EventQueue bindings
		eventQueue.init()
		
		console.log('[SaveSelectScene] Reloaded game systems with new save data')
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
	 * Export save to downloadable JSON file
	 */
	private exportSave(id: string, saveName: string) {
		console.log(`[SaveSelectScene] Exporting save: ${id}`)
		const json = SaveManager.exportSave(id)
		if (!json) {
			console.error('[SaveSelectScene] Failed to export save')
			return
		}

		// Create downloadable file
		const blob = new Blob([json], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `spellcompiler-save-${id.slice(-8)}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		URL.revokeObjectURL(url)

		console.log('[SaveSelectScene] Save exported successfully')
	}

	/**
	 * Import save from JSON file
	 */
	private importSaveFromFile() {
		console.log('[SaveSelectScene] Opening file picker for import')
		
		// Create file input
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = '.json'
		
		input.onchange = (e) => {
			const file = (e.target as HTMLInputElement).files?.[0]
			if (!file) return

			const reader = new FileReader()
			reader.onload = (event) => {
				try {
					const jsonString = event.target?.result as string
					const newId = SaveManager.importSave(jsonString)
					
					if (newId) {
						console.log(`[SaveSelectScene] Save imported successfully: ${newId}`)
						// Refresh the save list to show the new save
						this.refreshSaveList()
					} else {
						console.error('[SaveSelectScene] Failed to import save')
						this.showErrorMessage('Failed to import save file. Invalid format.')
					}
				} catch (err) {
					console.error('[SaveSelectScene] Import error:', err)
					this.showErrorMessage('Failed to import save file. Invalid format.')
				}
			}
			reader.readAsText(file)
		}
		
		// Trigger file picker
		input.click()
	}

	/**
	 * Show error message overlay
	 */
	private showErrorMessage(message: string) {
		// Create overlay
		const overlay = this.add.rectangle(480, 270, 960, 540, 0x000000, 0.7)
		overlay.setInteractive()
		overlay.setDepth(2000)

		// Error container
		const container = this.add.container(480, 270)
		container.setDepth(2001)

		// Background
		const bg = this.add.rectangle(0, 0, 400, 200, 0x1a1f2e)
		bg.setStrokeStyle(3, 0xe53e3e)
		container.add(bg)

		// Error icon
		const icon = this.add.text(0, -50, '❌', {
			fontSize: '48px',
		}).setOrigin(0.5)
		container.add(icon)

		// Message
		const text = this.add.text(0, 10, message, {
			fontSize: '16px',
			color: '#ffffff',
			align: 'center',
			wordWrap: { width: 350 }
		}).setOrigin(0.5)
		container.add(text)

		// OK button
		const okBtn = this.add.rectangle(0, 70, 120, 40, 0x4299e1)
		okBtn.setStrokeStyle(2, 0x63b3ed)
		okBtn.setInteractive({ useHandCursor: true })
		container.add(okBtn)

		const okText = this.add.text(0, 70, 'OK', {
			fontSize: '18px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5)
		container.add(okText)

		okBtn.on('pointerover', () => {
			okBtn.setFillStyle(0x63b3ed)
		})
		okBtn.on('pointerout', () => {
			okBtn.setFillStyle(0x4299e1)
		})
		okBtn.on('pointerdown', () => {
			container.destroy()
			overlay.destroy()
		})
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
