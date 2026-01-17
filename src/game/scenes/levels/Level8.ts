/**
 * Level 8 - Array and List Operations Challenge
 *
 * Programming concept: Use getCollectedBallWeights() and list operations to find the heaviest ball
 * Level design: Player collects multiple balls, uses list operations (sort, length, nth) to find the heaviest, and throws it to a gate
 * 
 * Learning objectives:
 * - Understand arrays/lists as collections of multiple data items
 * - Use getCollectedBallWeights() to get a list of all collected ball weights
 * - Use list operations: length(), sort(), nth(), head() to process the list
 * - Find the heaviest ball from a collection and throw it to the gate
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Sprite } from '../../components'
import { createCircleBody } from '../../prefabs/createCircleBody'
import { castSpell } from '../../spells/castSpell'

interface Ball {
	eid: number
	weight: number
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	collector: Phaser.Physics.Arcade.Image
	collected: boolean
	originalX: number
	originalY: number
	index: number // Index in collectedBalls array
}

interface Gate {
	rect: Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	activated: boolean
}

export class Level8 extends BaseScene {
	private balls: Ball[] = []
	private collectedBalls: Ball[] = [] // Can hold multiple balls (different from Level 7)
	private gate!: Gate
	private instructionText!: Phaser.GameObjects.Text
	private listDisplayText!: Phaser.GameObjects.Text
	private countText!: Phaser.GameObjects.Text
	private tutorialPanel!: Phaser.GameObjects.Container
	private tutorialVisible: boolean = false
	private ballReturning: boolean = false
	private minimapBallDots: Phaser.GameObjects.Arc[] = []
	private selectedBallForThrow: Ball | null = null
	private filteredWeightsForThrow: number[] = []
	private ballsInFlight: Ball[] = [] // Track balls currently being thrown

	constructor() {
		super({ key: 'Level8' })
	}

	protected onLevelCreate(): void {
		// Initialize collected ball weights list in level data
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.collectedBallWeights = []

		// Show pre-game tutorial first
		this.showPreGameTutorial()

		// Create balls with different weights
		this.createBalls()

		// Create gate
		this.createGate()

		// Create instruction panel
		this.instructionText = this.add.text(20, 100, 'Collect multiple balls! Use getCollectedBallWeights() to get the list!', {
			fontSize: '14px',
			color: '#ffff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create list display - shows current weights list
		this.listDisplayText = this.add.text(20, 130, 'Collected weights: []', {
			fontSize: '12px',
			color: '#888888',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create count display
		this.countText = this.add.text(20, 160, 'Balls collected: 0', {
			fontSize: '12px',
			color: '#00ff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create tutorial panel
		this.createTutorialPanel()

		// Update minimap to show balls
		this.updateMinimapWithBalls()

		// Bind key '1' to cast spell
		this.input.keyboard?.on('keydown-ONE', () => {
			this.castSpell()
		})

		// Bind key 'T' to toggle tutorial
		this.input.keyboard?.on('keydown-T', () => {
			this.toggleTutorial()
		})

		// Bind SPACE key to throw selected ball
		this.input.keyboard?.on('keydown-SPACE', () => {
			this.throwSelectedBall()
		})

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		// Update collected balls display
		this.updateListDisplay()

		// Keep collected balls near player (arranged in a line)
		this.updateCollectedBallsPosition()

		// Update minimap with balls
		this.updateMinimapWithBalls()

		// Check if gate is activated
		if (this.gate && !this.gate.activated) {
			this.checkGateActivation()
		}
	}

	private updateListDisplay() {
		const weights = this.collectedBalls.map(b => b.weight)
		// Hide actual weights - only show count
		this.listDisplayText.setText(`Collected weights: [???] (Use getCollectedBallWeights() to see)`)
		this.countText.setText(`Balls collected: ${this.collectedBalls.length}`)
		
		// Update level data for getCollectedBallWeights()
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.collectedBallWeights = weights
	}

	private updateCollectedBallsPosition() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		this.collectedBalls.forEach((ball, index) => {
			const ballBody = this.world.resources.bodies.get(ball.eid)
			if (ballBody) {
				// Arrange balls in a line behind the player
				const offsetX = -40 - (index * 50)
				const offsetY = 0
				const targetX = playerBody.x + offsetX
				const targetY = playerBody.y + offsetY
				
				const dx = targetX - ballBody.x
				const dy = targetY - ballBody.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				
				if (dist > 10) {
					ballBody.setPosition(targetX, targetY)
					ballBody.setVelocity(0, 0)
				}
			}
		})
	}

	private castSpell() {
		const playerEid = this.world.resources.playerEid
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				const result = castSpell(this.world, playerEid, spell)
				console.log('[Level8] Spell cast successfully, result:', result)

				// Task 2: Verify count using length()
				this.checkTask2VerifyCount(result)

				// Display result
				if (Array.isArray(result)) {
					// List result (could be filtered list for Task 5)
					this.instructionText.setText(`List result: [${result.join(', ')}]`)
					this.instructionText.setColor('#00ff00')
					
					// Task 5: Check if this is a filtered list for throwing heavy balls
					this.checkTask5FilteredList(result)
				} else if (typeof result === 'number') {
					// Number result (could be length, heaviest weight, second heaviest, etc.)
					this.instructionText.setText(`Result: ${result}`)
					this.instructionText.setColor('#00ff00')
					
					// Task 3 & 4: Check if this is a target weight for throwing
					this.checkTask3And4TargetWeight(result)
				} else {
					this.instructionText.setText(`Result: ${JSON.stringify(result)}`)
					this.instructionText.setColor('#00ff00')
				}
			} catch (err) {
				console.error('[Level8] Spell error:', err)
				this.instructionText.setText(`Error: ${err instanceof Error ? err.message : String(err)}`)
				this.instructionText.setColor('#ff0000')
				this.time.delayedCall(2000, () => {
					this.instructionText.setColor('#ffff00')
				})
			}
		} else {
			console.warn('[Level8] No spell equipped. Use TAB to create a spell.')
			this.instructionText.setText('No spell equipped! Press TAB to create one.')
			this.instructionText.setColor('#ffaa00')
		}
	}

	private checkTask2VerifyCount(result: any) {
		// Task 2: Verify count - result should be a number >= 3
		const task2 = this.allObjectives.find(obj => obj.id === 'verify-count')
		if (task2 && !task2.completed && typeof result === 'number' && result >= 3) {
			this.completeObjectiveById('verify-count')
			this.instructionText.setText(`✓ Count verified: ${result} balls collected!`)
			this.instructionText.setColor('#00ff00')
		}
	}

	private checkTask3And4TargetWeight(result: any) {
		// Task 3: Throw heaviest ball
		const task3 = this.allObjectives.find(obj => obj.id === 'throw-heaviest')
		if (task3 && !task3.completed && typeof result === 'number') {
			// Check if this is the heaviest weight
			const sortedWeights = [...this.collectedBalls.map(b => b.weight)].sort((a, b) => a - b)
			const heaviestWeight = sortedWeights[sortedWeights.length - 1]
			if (result === heaviestWeight) {
				// Player found the heaviest weight, prompt to throw
				this.instructionText.setText(`Found heaviest weight: ${result}. Press SPACE to throw it!`)
				this.instructionText.setColor('#ffff00')
				this.selectedBallForThrow = this.collectedBalls.find(b => b.weight === result) || null
			}
		}

		// Task 4: Throw second heaviest ball
		const task4 = this.allObjectives.find(obj => obj.id === 'throw-second-heaviest')
		if (task4 && !task4.completed && typeof result === 'number') {
			// Check if this is the second heaviest weight
			const sortedWeights = [...this.collectedBalls.map(b => b.weight)].sort((a, b) => a - b)
			const secondHeaviestWeight = sortedWeights.length >= 2 ? sortedWeights[sortedWeights.length - 2] : null
			if (secondHeaviestWeight !== null && result === secondHeaviestWeight) {
				// Player found the second heaviest weight, prompt to throw
				this.instructionText.setText(`Found second heaviest weight: ${result}. Press SPACE to throw it!`)
				this.instructionText.setColor('#ffff00')
				this.selectedBallForThrow = this.collectedBalls.find(b => b.weight === result) || null
			}
		}
	}

	private checkTask5FilteredList(result: any) {
		// Task 5: Throw all balls heavier than 20
		const task5 = this.allObjectives.find(obj => obj.id === 'throw-heavy-balls')
		if (task5 && !task5.completed && Array.isArray(result)) {
			// Check if this is a filtered list of weights > 20
			const allWeights = this.collectedBalls.map(b => b.weight)
			const expectedFiltered = allWeights.filter(w => w > 20).sort((a, b) => a - b)
			const resultSorted = [...result].sort((a, b) => (a as number) - (b as number))
			
			// Check if result matches expected filtered list
			if (expectedFiltered.length > 0 && 
				resultSorted.length === expectedFiltered.length &&
				resultSorted.every((w, i) => w === expectedFiltered[i])) {
				// Player found the filtered list, prompt to throw
				this.instructionText.setText(`Found ${result.length} heavy ball(s) (>20). Press SPACE to throw them!`)
				this.instructionText.setColor('#ffff00')
				// Store filtered weights for throwing
				this.filteredWeightsForThrow = result as number[]
			}
		}
	}

	private throwSelectedBall() {
		if (this.collectedBalls.length === 0) {
			this.instructionText.setText('No balls collected! Collect some balls first.')
			this.instructionText.setColor('#ffaa00')
			this.time.delayedCall(2000, () => {
				this.instructionText.setColor('#ffff00')
			})
			return
		}

		// Task 5: Throw multiple filtered balls
		if (this.filteredWeightsForThrow.length > 0) {
			this.throwBallsByFilter(this.filteredWeightsForThrow)
			this.filteredWeightsForThrow = []
			return
		}

		// Task 3 & 4: Throw single ball by weight
		if (this.selectedBallForThrow) {
			this.throwBallToGate(this.selectedBallForThrow)
			this.ballsInFlight.push(this.selectedBallForThrow)
			this.instructionText.setText(`Throwing ball to gate...`)
			this.instructionText.setColor('#ffff00')
			this.selectedBallForThrow = null
			return
		}

		// Fallback: Find the heaviest ball (for backward compatibility)
		const heaviestBall = this.collectedBalls.reduce((max, ball) => 
			ball.weight > max.weight ? ball : max
		)

		// Select it for throwing
		this.selectedBallForThrow = heaviestBall
		this.throwBallToGate(heaviestBall)
		this.ballsInFlight.push(heaviestBall)
		this.instructionText.setText(`Throwing ball to gate...`)
		this.instructionText.setColor('#ffff00')
	}

	private throwBallsByFilter(filteredWeights: number[]): void {
		if (filteredWeights.length === 0) {
			this.instructionText.setText('No balls match the filter!')
			this.instructionText.setColor('#ffaa00')
			return
		}

		// Find all balls matching the filtered weights
		const ballsToThrow = this.collectedBalls.filter(b => filteredWeights.includes(b.weight))
		
		if (ballsToThrow.length === 0) {
			this.instructionText.setText('No balls match the filtered weights!')
			this.instructionText.setColor('#ffaa00')
			return
		}

		// Throw all matching balls with slight delays
		ballsToThrow.forEach((ball, index) => {
			this.time.delayedCall(index * 200, () => {
				this.throwBallToGate(ball)
				this.ballsInFlight.push(ball)
			})
		})

		this.instructionText.setText(`Throwing ${ballsToThrow.length} heavy ball(s) to gate...`)
		this.instructionText.setColor('#ffff00')
	}

	private throwBallToGate(ball: Ball) {
		if (!ball || !this.gate) return

		const ballBody = this.world.resources.bodies.get(ball.eid)
		if (!ballBody) return

		const gateX = this.gate.rect.x
		const gateY = this.gate.rect.y

		// Calculate direction to gate
		const dx = gateX - ballBody.x
		const dy = gateY - ballBody.y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1

		// Set velocity toward gate
		const speed = 300
		ballBody.setVelocity((dx / dist) * speed, (dy / dist) * speed)
	}

	private createTutorialPanel() {
		const panelWidth = 500
		const panelHeight = 450
		const panelX = 480
		const panelY = 270

		// Create background
		const bg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
		bg.setStrokeStyle(3, 0xffffff)
		bg.setScrollFactor(0)
		bg.setDepth(2000)

		// Create title
		const title = this.add.text(panelX, panelY - 200, 'Arrays and Lists Tutorial', {
			fontSize: '20px',
			color: '#ffff00',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)

		// Create content
		const content = [
			'📚 WHAT IS AN ARRAY/LIST?',
			'',
			'An array (or list) is a collection of multiple data items.',
			'Think of it like a shopping list or a row of boxes.',
			'',
			'Example: [15, 8, 23, 5, 31]',
			'  • This is a list of 5 numbers (ball weights)',
			'  • Each number is an element in the list',
			'  • Elements are ordered (first, second, third...)',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🔧 LIST OPERATIONS',
			'',
			'length(list) - Get the number of elements',
			'  Example: length([15, 8, 23]) = 3',
			'',
			'sort(list) - Sort elements (smallest to largest)',
			'  Example: sort([15, 8, 23]) = [8, 15, 23]',
			'',
			'nth(list, index) - Get element at position',
			'  Example: nth([8, 15, 23], 0) = 8 (first element)',
			'  Example: nth([8, 15, 23], 2) = 23 (last element)',
			'',
			'head(list) - Get first element',
			'  Example: head([8, 15, 23]) = 8',
			'',
			'tail(list) - Get all elements except first',
			'  Example: tail([8, 15, 23]) = [15, 23]',
			'  Use: tail() then head() to get second element!',
			'',
			'filter(fn, list) - Keep only elements that pass test',
			'  Example: filter(gt(20), [15, 8, 23, 5, 31])',
			'  Returns: [23, 31] (only weights > 20)',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🔍 COMPARISON FUNCTIONS',
			'',
			'gt(a, b) - Greater than: returns true if a > b',
			'  Example: gt(23, 20) = true',
			'',
			'lt(a, b) - Less than: returns true if a < b',
			'',
			'Use with filter to find specific elements!',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'In this level:',
			'  • Task 1: Collect at least 3 balls',
			'  • Task 2: Use length() to verify count',
			'  • Task 3: Use sort() + nth() to find heaviest',
			'  • Task 4: Use sort() + tail() + head() for second',
			'  • Task 5: Use filter() + gt() to find balls > 20',
		]

		const contentText = this.add.text(panelX, panelY - 150, content, {
			fontSize: '12px',
			color: '#ffffff',
			align: 'left',
			lineSpacing: 4,
			wordWrap: { width: panelWidth - 40 },
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001)

		// Create close button
		const closeBtn = this.add.text(panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20, '✕', {
			fontSize: '24px',
			color: '#ff6666',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)
		closeBtn.setInteractive({ useHandCursor: true })
		closeBtn.on('pointerdown', () => {
			this.toggleTutorial()
		})

		// Create container
		this.tutorialPanel = this.add.container(0, 0, [bg, title, contentText, closeBtn])
		this.tutorialPanel.setVisible(false)
		this.tutorialPanel.setScrollFactor(0)
	}

	private showPreGameTutorial() {
		const panelWidth = 600
		const panelHeight = 500
		const panelX = 480
		const panelY = 270

		// Create background overlay
		const overlay = this.add.rectangle(panelX, panelY, 960, 540, 0x000000, 0.85)
		overlay.setScrollFactor(0).setDepth(3000)

		// Create background panel
		const bg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a1a, 0.98)
		bg.setStrokeStyle(4, 0x4a90e2)
		bg.setScrollFactor(0).setDepth(3001)

		// Create title
		const title = this.add.text(panelX, panelY - 220, '📚 Arrays and Lists Tutorial', {
			fontSize: '24px',
			color: '#ffff00',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(3002)

		// Create content
		const content = [
			'Welcome to Level 8! In this level, you\'ll learn about arrays and lists.',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'📦 WHAT IS AN ARRAY/LIST?',
			'',
			'An array (also called a list) is a collection of multiple data items.',
			'Think of it like:',
			'  • A shopping list: [milk, bread, eggs]',
			'  • A row of numbered boxes: [box1, box2, box3]',
			'  • A list of numbers: [15, 8, 23, 5, 31]',
			'',
			'In Level 7, you worked with ONE ball at a time.',
			'In Level 8, you can collect MULTIPLE balls and work with them as a list!',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🔧 LIST OPERATIONS',
			'',
			'getCollectedBallWeights() - Get list of all collected ball weights',
			'  Returns: [15, 8, 23] (example)',
			'',
			'length(list) - Count how many items in the list',
			'  Example: length([15, 8, 23]) = 3',
			'',
			'sort(list) - Sort from smallest to largest',
			'  Example: sort([15, 8, 23]) = [8, 15, 23]',
			'',
			'nth(list, index) - Get item at position (0 = first, 1 = second...)',
			'  Example: nth([8, 15, 23], 2) = 23 (third item = heaviest)',
			'',
			'head(list) - Get first item (smallest after sort)',
			'  Example: head([8, 15, 23]) = 8',
			'',
			'To find heaviest: sort first, then use nth(sorted, length-1)',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🔍 MORE LIST OPERATIONS',
			'',
			'tail(list) - Get all elements except first',
			'  Example: tail([8, 15, 23]) = [15, 23]',
			'  Use: tail() then head() to get second element!',
			'',
			'filter(fn, list) - Keep only elements that pass test',
			'  Requires a function that returns true/false',
			'  Example: filter(gt(20), [15, 8, 23, 5, 31])',
			'  Returns: [23, 31] (only weights > 20)',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'YOUR MISSION:',
			'Task 1: Collect at least 3 balls',
			'Task 2: Use length() to verify count >= 3',
			'Task 3: Use sort() + nth() to find heaviest ball',
			'Task 4: Use sort() + tail() + head() for second heaviest',
			'Task 5: Use filter() + gt() to find all balls > 20',
		]

		const contentText = this.add.text(panelX, panelY - 180, content, {
			fontSize: '13px',
			color: '#ffffff',
			align: 'left',
			lineSpacing: 5,
			wordWrap: { width: panelWidth - 60 },
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002)

		// Create continue button
		const continueBtn = this.add.rectangle(panelX, panelY + 200, 200, 50, 0x4a90e2, 1)
		continueBtn.setStrokeStyle(2, 0xffffff)
		continueBtn.setScrollFactor(0).setDepth(3002)
		continueBtn.setInteractive({ useHandCursor: true })

		const continueText = this.add.text(panelX, panelY + 200, 'Continue to Game', {
			fontSize: '18px',
			color: '#ffffff',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(3003)

		// Button hover effect
		continueBtn.on('pointerover', () => {
			continueBtn.setFillStyle(0x5aa0f2)
		})
		continueBtn.on('pointerout', () => {
			continueBtn.setFillStyle(0x4a90e2)
		})

		// Button click handler
		continueBtn.on('pointerdown', () => {
			overlay.destroy()
			bg.destroy()
			title.destroy()
			contentText.destroy()
			continueBtn.destroy()
			continueText.destroy()

			// Show game instructions
			this.showInstruction(
				'【Level 8: Array and List Operations】\n\n' +
				'GOAL: Complete 5 tasks using different list operations!\n\n' +
				'TASK 1: Collect at least 3 balls\n' +
				'TASK 2: Use length() to verify you collected >= 3 balls\n' +
				'TASK 3: Use sort() + nth() to find the heaviest ball and throw it\n' +
				'TASK 4: Use sort() + tail() + head() to find the second heaviest and throw it\n' +
				'TASK 5: Use filter() + gt() to find all balls > 20 and throw them\n\n' +
				'CONTROLS:\n' +
				'- TAB: Open editor\n' +
				'- 1: Cast spell\n' +
				'- SPACE: Throw selected ball(s)\n' +
				'- T: Toggle tutorial\n\n' +
				'NOTE: Weights are hidden! Use getCollectedBallWeights() to see them.\n' +
				'Only list-related functions are allowed (no math functions).'
			)
		})
	}

	private toggleTutorial() {
		this.tutorialVisible = !this.tutorialVisible
		this.tutorialPanel.setVisible(this.tutorialVisible)
		
		if (this.tutorialVisible) {
			this.instructionText.setText('Tutorial opened! Press T again to close.')
		} else {
			this.instructionText.setText('Tutorial closed. Press T to open again.')
		}
		this.time.delayedCall(2000, () => {
			if (this.collectedBalls.length > 0) {
				this.instructionText.setText(`Collected ${this.collectedBalls.length} balls! Use getCollectedBallWeights() to get the list.`)
			} else {
				this.instructionText.setText('Collect multiple balls! Use getCollectedBallWeights() to get the list!')
			}
			this.instructionText.setColor('#ffff00')
		})
	}

	private updateMinimapWithBalls() {
		// Clear previous ball dots
		this.minimapBallDots.forEach((dot) => dot.destroy())
		this.minimapBallDots = []

		const minimapContainer = (this as any).minimapContainer
		if (!minimapContainer) return

		const size = 150
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540
		const scaleX = size / worldWidth
		const scaleY = size / worldHeight

		// Add dots for uncollected balls
		this.balls.forEach((ball) => {
			if (!ball.collected) {
				const minimapX = ball.originalX * scaleX
				const minimapY = ball.originalY * scaleY
				const dot = this.add.circle(minimapX, minimapY, 3, 0x4a90e2, 0.9)
				dot.setScrollFactor(0).setDepth(1001)
				minimapContainer.add(dot)
				this.minimapBallDots.push(dot)
			}
		})
	}

	private createGate() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		
		// Create gate on the right side
		const gateX = worldWidth - 100
		const gateY = playerBody.y
		
		const rect = this.add.rectangle(gateX, gateY, 60, 120, 0x888888, 0.8)
		rect.setStrokeStyle(3, 0xffffff)
		
		const label = this.add.text(gateX, gateY - 70, 'GATE\n(Throw heaviest ball here)', {
			fontSize: '14px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 2,
			align: 'center',
		}).setOrigin(0.5)

		this.gate = {
			rect,
			label,
			activated: false,
		}
	}

	private collectBall(ball: Ball) {
		// Unlike Level 7, we can collect multiple balls
		if (ball.collected) return

		// Collect the ball
		ball.collected = true
		ball.index = this.collectedBalls.length
		this.collectedBalls.push(ball)

		// Update level data with collected ball weights list
		this.updateListDisplay()

		// Show the ball body and position it near player
		const ballBody = this.world.resources.bodies.get(ball.eid)
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (ballBody && playerBody) {
			ballBody.setVisible(true)
			ballBody.setPosition(playerBody.x - 40 - (this.collectedBalls.length - 1) * 50, playerBody.y)
			ballBody.setVelocity(0, 0)
		}

		// Remove visual marker and label of collected ball
		ball.marker.destroy()
		ball.label.destroy()
		ball.collector.destroy()

		// Update instruction
		this.instructionText.setText(`Collected ${this.collectedBalls.length} balls! Use getCollectedBallWeights() to get the list.`)
		this.instructionText.setColor('#ffff00')

		// Update task progress
		this.updateObjectiveDescription('collect-balls', `Collect at least 3 balls (${this.collectedBalls.length}/3)`)
		
		// Check task progress
		if (this.collectedBalls.length >= 3) {
			this.completeObjectiveById('collect-balls')
		}
	}

	private checkGateActivation() {
		if (!this.gate || this.gate.activated || this.ballReturning) return

		const gateX = this.gate.rect.x
		const gateY = this.gate.rect.y

		// Check all balls in flight
		for (let i = this.ballsInFlight.length - 1; i >= 0; i--) {
			const ball = this.ballsInFlight[i]
			const ballBody = this.world.resources.bodies.get(ball.eid)
			if (!ballBody) {
				this.ballsInFlight.splice(i, 1)
				continue
			}

			const dx = ballBody.x - gateX
			const dy = ballBody.y - gateY
			const dist = Math.sqrt(dx * dx + dy * dy)

			// Check if ball reached the gate
			if (dist < 40) {
				ballBody.setVelocity(0, 0)
				this.ballsInFlight.splice(i, 1)

				// Task 3: Verify heaviest ball
				const task3 = this.allObjectives.find(obj => obj.id === 'throw-heaviest')
				if (task3 && !task3.completed) {
					const sortedWeights = [...this.collectedBalls.map(b => b.weight)].sort((a, b) => a - b)
					const heaviestWeight = sortedWeights[sortedWeights.length - 1]
					if (ball.weight === heaviestWeight) {
						this.completeObjectiveById('throw-heaviest')
						this.instructionText.setText('SUCCESS! Heaviest ball thrown! Now find the second heaviest.')
						this.instructionText.setColor('#00ff00')
						this.cameras.main.flash(200, 0, 255, 0)
						this.removeBallFromCollection(ball)
						return
					} else {
						this.returnBallToOriginalPosition(ball)
						this.instructionText.setText('WRONG! This ball is not the heaviest. Try again!')
						this.instructionText.setColor('#ff0000')
						this.cameras.main.flash(200, 255, 0, 0)
						return
					}
				}

				// Task 4: Verify second heaviest ball
				const task4 = this.allObjectives.find(obj => obj.id === 'throw-second-heaviest')
				if (task4 && !task4.completed) {
					const sortedWeights = [...this.collectedBalls.map(b => b.weight)].sort((a, b) => a - b)
					const secondHeaviestWeight = sortedWeights.length >= 2 ? sortedWeights[sortedWeights.length - 2] : null
					if (secondHeaviestWeight !== null && ball.weight === secondHeaviestWeight) {
						this.completeObjectiveById('throw-second-heaviest')
						this.instructionText.setText('SUCCESS! Second heaviest ball thrown! Now filter balls > 20.')
						this.instructionText.setColor('#00ff00')
						this.cameras.main.flash(200, 0, 255, 0)
						this.removeBallFromCollection(ball)
						return
					} else {
						this.returnBallToOriginalPosition(ball)
						this.instructionText.setText('WRONG! This ball is not the second heaviest. Try again!')
						this.instructionText.setColor('#ff0000')
						this.cameras.main.flash(200, 255, 0, 0)
						return
					}
				}

				// Task 5: Verify filtered heavy balls
				const task5 = this.allObjectives.find(obj => obj.id === 'throw-heavy-balls')
				if (task5 && !task5.completed) {
					// Check if this ball is heavier than 20
					if (ball.weight > 20) {
						this.removeBallFromCollection(ball)
						
						// Check if all heavy balls (>20) have been thrown
						const remainingHeavyBalls = this.collectedBalls.filter(b => b.weight > 20)
						if (remainingHeavyBalls.length === 0) {
							// All heavy balls thrown!
							this.completeObjectiveById('throw-heavy-balls')
							this.gate.activated = true
							this.gate.rect.setFillStyle(0x00ff00, 0.8)
							this.instructionText.setText('SUCCESS! All heavy balls (>20) thrown! Level complete!')
							this.instructionText.setColor('#00ff00')
							this.cameras.main.flash(200, 0, 255, 0)
						} else {
							this.instructionText.setText(`Good! ${remainingHeavyBalls.length} more heavy ball(s) to throw.`)
							this.instructionText.setColor('#ffff00')
						}
						return
					} else {
						this.returnBallToOriginalPosition(ball)
						this.instructionText.setText('WRONG! This ball is not heavier than 20. Try again!')
						this.instructionText.setColor('#ff0000')
						this.cameras.main.flash(200, 255, 0, 0)
						return
					}
				}
			}
		}
	}

	private removeBallFromCollection(ball: Ball) {
		const index = this.collectedBalls.indexOf(ball)
		if (index > -1) {
			this.collectedBalls.splice(index, 1)
		}
		ball.collected = false
		
		// Hide the ball body
		const ballBody = this.world.resources.bodies.get(ball.eid)
		if (ballBody) {
			ballBody.setVisible(false)
		}

		// Update list display
		this.updateListDisplay()
	}

	private returnBallToOriginalPosition(ball: Ball) {
		const ballBody = this.world.resources.bodies.get(ball.eid)
		if (!ballBody) return

		// Set flag to prevent multiple triggers
		this.ballReturning = true

		// Stop the ball
		ballBody.setVelocity(0, 0)

		// Remove from collected balls
		const index = this.collectedBalls.indexOf(ball)
		if (index > -1) {
			this.collectedBalls.splice(index, 1)
		}
		ball.collected = false
		this.selectedBallForThrow = null

		// Update list display
		this.updateListDisplay()

		// Animate ball returning to original position
		this.tweens.add({
			targets: ballBody,
			x: ball.originalX,
			y: ball.originalY,
			duration: 800,
			ease: 'Power2',
			onComplete: () => {
				// Hide the ball body
				ballBody.setVisible(false)

				// Restore visual marker and label at original position
				ball.marker = this.add.circle(
					ball.originalX,
					ball.originalY,
					20,
					0x4a90e2,
					0.8
				).setStrokeStyle(2, 0x4a90e2)
				ball.label = this.add.text(
					ball.originalX,
					ball.originalY - 35,
					'?',
					{
						fontSize: '12px',
						color: '#ffffff',
						stroke: '#000000',
						strokeThickness: 2,
					}
				).setOrigin(0.5)

				// Recreate collector at original position
				ball.collector = this.physics.add.image(ball.originalX, ball.originalY, '').setVisible(false).setSize(40, 40)

				// Recreate collision detection for the restored ball
				this.physics.add.overlap(
					this.world.resources.bodies.get(this.world.resources.playerEid)!,
					ball.collector,
					() => {
						if (ball && !ball.collected) {
							this.collectBall(ball)
						}
					}
				)

				// Reset flag
				this.ballReturning = false
			}
		})
	}

	private createBalls() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540

		// Create 6 balls with different weights
		const weights = [15, 8, 23, 5, 31, 12] // Predefined weights for consistency
		const positions = [
			{ x: Math.min(playerBody.x + 200, worldWidth - 50), y: Math.max(playerBody.y - 100, 50) },
			{ x: Math.min(playerBody.x + 350, worldWidth - 50), y: Math.max(playerBody.y - 50, 50) },
			{ x: Math.min(playerBody.x + 500, worldWidth - 50), y: Math.min(playerBody.y + 100, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 150, 50), y: Math.min(playerBody.y + 150, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 300, 50), y: Math.max(playerBody.y - 150, 50) },
			{ x: Math.min(playerBody.x + 150, worldWidth - 50), y: Math.min(playerBody.y + 200, worldHeight - 50) },
		]

		positions.forEach((pos, index) => {
			const weight = weights[index]
			const color = 0x4a90e2 // Blue color for balls

			// Create visual marker (ball) - weight is hidden
			const marker = this.add.circle(pos.x, pos.y, 20, color, 0.8).setStrokeStyle(2, color)
			
			// No label - weight is hidden
			const label = this.add.text(pos.x, pos.y - 35, '?', {
				fontSize: '12px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 2,
			}).setOrigin(0.5)

			// Create invisible collector
			const collector = this.physics.add.image(pos.x, pos.y, '').setVisible(false).setSize(40, 40)

			// Create collision detection
			this.physics.add.overlap(
				this.world.resources.bodies.get(this.world.resources.playerEid)!,
				collector,
				() => {
					const ball = this.balls.find((b) => b.collector === collector)
					if (ball && !ball.collected) {
						this.collectBall(ball)
					}
				}
			)

			// Create entity for the ball - use circular body
			const eid = spawnEntity(this.world)
			const body = createCircleBody(this, `ball-${index}`, color, 20, pos.x, pos.y, 1)
			body.setImmovable(false)
			body.setVisible(false) // Initially hidden, will be shown when collected
			this.world.resources.bodies.set(eid, body)
			addComponent(this.world, eid, Sprite)

			this.balls.push({
				eid,
				weight,
				marker,
				label,
				collector,
				collected: false,
				originalX: pos.x,
				originalY: pos.y,
				index: -1,
			})
		})
	}
}
