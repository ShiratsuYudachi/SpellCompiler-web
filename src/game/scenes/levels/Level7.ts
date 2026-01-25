/**
 * Level 7 - Object-Oriented Programming: Classes, Objects, and Attributes
 *
 * Programming concept: Introduction to classes, objects, and attributes
 * Level design: Two tasks demonstrating object attribute access and comparison
 * 
 * Task 1: Use getWeight() to find the heaviest ball
 * - Allowed nodes: getWeight(), Output
 * - Goal: Collect balls, check their weight, and throw the heaviest to the gate
 * 
 * Task 2: Classify balls by weight comparison
 * - Allowed nodes: measureWeight(), comparison operators (cmp)
 * - Goal: Collect, classify, and throw balls to three categories (heavier, lighter, equal to threshold)
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Sprite } from '../../components'
import { createCircleBody } from '../../prefabs/createCircleBody'
import { castSpell } from '../../spells/castSpell'
import { forceRefreshEditor } from '../../gameInstance'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'

export const Level7Meta: LevelMeta = {
	key: 'Level7',
	playerSpawnX: 200,
	playerSpawnY: 300,
	mapData: createRoom(15, 9),
	tileSize: 64,
	// Task 1: Allow only getWeight function and output node
	editorRestrictions: /^(game::getWeight)$/,
	// Task 2 (dynamically updated): measureWeight, getThreshold, comparison operators (std::cmp::*)
	// Only allow necessary node types for Task 1
	allowedNodeTypes: ['output', 'dynamicFunction'],
	objectives: [
		{
			id: 'task1-heaviest',
			description: 'Task 1: Find the heaviest ball and throw it to the gate',
			type: 'defeat',
		},
		{
			id: 'task2-classify',
			description: 'Task 2: Classify all balls by weight comparison',
			type: 'defeat',
			prerequisite: 'task1-heaviest',
		},
	],
	// Pre-made spell: getWeight + output
	initialSpellWorkflow: {
		nodes: [
			{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
			{
				id: 'func-getWeight',
				type: 'dynamicFunction',
				position: { x: 200, y: 200 },
				data: {
					functionName: 'game::getWeight',
					displayName: 'getWeight',
					namespace: 'game',
					params: [],
				},
			},
		],
		edges: [
			{ id: 'e1', source: 'func-getWeight', target: 'output-1', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level7Meta)

interface Ball {
	eid: number
	weight: number
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	collector: Phaser.Physics.Arcade.Image
	collected: boolean
	originalX: number
	originalY: number
}

interface Gate {
	rect: Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	activated: boolean
	category?: 'heavier' | 'lighter' | 'equal' // For Task 2
}

type TaskType = 'task1' | 'task2'

export class Level7 extends BaseScene {
	private balls: Ball[] = []
	private gate!: Gate
	private gates: Gate[] = [] // For Task 2: three gates
	private instructionText!: Phaser.GameObjects.Text
	private currentWeightText!: Phaser.GameObjects.Text
	private tutorialPanel!: Phaser.GameObjects.Container
	private tutorialVisible: boolean = false
	private currentBall: Ball | null = null
	private heaviestWeight: number = 0
	private ballReturning: boolean = false
	private minimapBallDots: Phaser.GameObjects.Arc[] = []
	private weightRevealed: boolean = false // Track if weight has been revealed by casting spell
	private currentTask: TaskType = 'task1'
	private thresholdWeight: number = 20 // Threshold for Task 2
	private tutorialCurrentPage: number = 0
	private tutorialTotalPages: number = 3
	private tutorialContentText!: Phaser.GameObjects.Text
	private tutorialPageIndicator!: Phaser.GameObjects.Text
	private tutorialPrevBtn!: Phaser.GameObjects.Text
	private tutorialNextBtn!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level7' })
	}

	protected onLevelCreate(): void {
		// Reset all state when entering the level (in case scene is reused)
		this.currentTask = 'task1'
		this.currentBall = null
		this.balls = []
		this.gates = []
		this.weightRevealed = false
		this.ballReturning = false
		this.minimapBallDots = []
		this.tutorialVisible = false
		this.tutorialCurrentPage = 0
		
		// Reset scene config to Task 1 settings
		const config = levelRegistry.get('Level7')
		if (config) {
			Object.assign(config, {
				editorRestrictions: /^(game::getWeight)$/,
				allowedNodeTypes: ['output', 'dynamicFunction'],
			})
		}
		
		// Clear Task 2 workflow and restore Task 1 default workflow
		const storageKey = `spell-workflow-Level7`
		const task1Workflow = {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
				{
					id: 'func-getWeight',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'game::getWeight',
						displayName: 'getWeight',
						namespace: 'game',
						params: [],
					},
				},
			],
			edges: [
				{ id: 'e1', source: 'func-getWeight', target: 'output-1', targetHandle: 'value' },
			],
		}
		localStorage.setItem(storageKey, JSON.stringify(task1Workflow))
		
		// Force editor to refresh with Task 1 settings
		this.time.delayedCall(50, () => {
			forceRefreshEditor()
		})
		
		// Initialize current ball weight in level data
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentBallWeight = null
		this.world.resources.levelData.thresholdWeight = this.thresholdWeight
		this.world.resources.levelData.currentTask = 'task1' // Set initial task

		// Show pre-game tutorial first
		this.showPreGameTutorial()

		// Create balls with different weights
		this.createBalls()

		// Calculate heaviest weight from all balls
		this.heaviestWeight = Math.max(...this.balls.map(b => b.weight))

		// Create gate for Task 1
		this.createGate()

		// Create instruction panel
		this.instructionText = this.add.text(20, 100, 'Task 1: Collect a ball and use getWeight() to check its weight!', {
			fontSize: '14px',
			color: '#ffff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create current weight display - hidden until spell is cast
		this.currentWeightText = this.add.text(20, 130, 'Current ball weight: (Cast getWeight() spell to reveal)', {
			fontSize: '12px',
			color: '#888888',
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

		// Bind SPACE key to throw ball
		this.input.keyboard?.on('keydown-SPACE', () => {
			this.throwBallManually()
		})

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		// Task 2: Continuously clear spell message to prevent it from showing in HUD
		if (this.currentTask === 'task2') {
			this.world.resources.spellMessageByEid.set(this.world.resources.playerEid, '')
		}

		// Update current weight display based on task
		if (this.currentTask === 'task1') {
			// Task 1: Show weight when revealed
			if (this.weightRevealed) {
				const currentWeight = this.world.resources.levelData?.currentBallWeight
				if (currentWeight !== null && currentWeight !== undefined) {
					this.currentWeightText.setText(`Current ball weight: ${currentWeight}`)
				} else {
					this.currentWeightText.setText('Current ball weight: None')
				}
			} else {
				this.currentWeightText.setText('Current ball weight: (Cast getWeight() spell to reveal)')
			}
		} else {
			// Task 2: Never show weight directly (measureWeight)
			this.currentWeightText.setText(`Threshold: ${this.thresholdWeight} (Use measureWeight() and comparison operators)`)
			this.currentWeightText.setColor('#00aaff')
		}

		// Keep collected ball near player (only if not being thrown)
		if (this.currentBall) {
			const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
			const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
			if (ballBody && playerBody) {
				const body = ballBody.body
				if (body && body.velocity.x === 0 && body.velocity.y === 0 && !this.isAnyGateActivated()) {
					// If ball is not being thrown and no gate is activated, keep it near player
					const dx = playerBody.x - ballBody.x
					const dy = playerBody.y - ballBody.y
					const dist = Math.sqrt(dx * dx + dy * dy)
					if (dist > 50) {
						ballBody.setPosition(playerBody.x + 30, playerBody.y)
					}
				}
			}
		}

		// Update minimap with balls
		this.updateMinimapWithBalls()

		// Check gate activation based on current task
		if (this.currentTask === 'task1') {
			if (this.gate && !this.gate.activated) {
				this.checkGateActivation()
			}
		} else {
			// Task 2: Check all three gates (gates are reusable, always check)
			this.gates.forEach(gate => {
				this.checkGateActivationTask2(gate)
			})
			
			// Prevent ball from flying out of bounds
			if (this.currentBall && !this.ballReturning) {
				const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
				if (ballBody) {
					const worldWidth = (this as any).worldWidth || 960
					const worldHeight = (this as any).worldHeight || 540
					
					// If ball goes out of bounds, return it
					if (ballBody.x < 0 || ballBody.x > worldWidth || ballBody.y < 0 || ballBody.y > worldHeight) {
						console.warn('[Level7] Ball went out of bounds, returning it')
						this.returnBallToOriginalPosition(this.currentBall)
						this.instructionText.setText('Ball went out of bounds! Try again.')
						this.instructionText.setColor('#ff0000')
						this.time.delayedCall(2000, () => {
							this.instructionText.setText('Task 2: Use measureWeight() and comparison to classify balls!')
							this.instructionText.setColor('#ffff00')
						})
					}
				}
			}
		}
	}

	private castSpell() {
		const playerEid = this.world.resources.playerEid
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				// Task 2: Check if measureWeight() is directly connected to output (cheating detection)
				if (this.currentTask === 'task2') {
					const isDirectMeasureWeight = this.isDirectMeasureWeightConnection(spell.body)
					if (isDirectMeasureWeight) {
						this.instructionText.setText('ERROR: measureWeight() cannot be directly connected to Output! You must use comparison operators.')
						this.instructionText.setColor('#ff0000')
						this.time.delayedCall(3000, () => {
							this.instructionText.setText('Task 2: Use measureWeight() and comparison to classify balls!')
							this.instructionText.setColor('#ffff00')
						})
						return // Don't execute the spell
					}
					// Clear spell message before casting to prevent it from showing
					this.world.resources.spellMessageByEid.set(this.world.resources.playerEid, '')
				}
				
				const result = castSpell(this.world, playerEid, spell)
				console.log('[Level7] Spell cast successfully, result:', result)

				if (this.currentTask === 'task1') {
					// Task 1: Display weight result
					if (typeof result === 'number') {
						// Mark weight as revealed
						this.weightRevealed = true
						
						// Update weight display text color to visible
						this.currentWeightText.setColor('#00ff00')
						
						// Don't give hints about whether it's the heaviest
						this.instructionText.setText('Weight measured. Collect another ball to compare, or press SPACE to throw.')
						this.instructionText.setColor('#ffff00')
					} else {
						this.instructionText.setText('Error: Spell should return a number (weight)')
						this.instructionText.setColor('#ff0000')
						this.time.delayedCall(2000, () => {
							this.instructionText.setColor('#ffff00')
						})
					}
				} else {
					// Task 2: Don't show spell result - players should not see it
					// Clear any spell message to prevent it from showing in HUD
					// Clear immediately and also in next frame to ensure it's cleared
					this.world.resources.spellMessageByEid.set(this.world.resources.playerEid, '')
					this.time.delayedCall(0, () => {
						this.world.resources.spellMessageByEid.set(this.world.resources.playerEid, '')
					})
					// Just show a generic message without revealing any result
					this.instructionText.setText(`Spell cast. Press SPACE to throw ball to test your logic.`)
					this.instructionText.setColor('#ffff00')
				}
			} catch (err) {
				console.error('[Level7] Spell error:', err)
				this.instructionText.setText(`Error: ${err instanceof Error ? err.message : String(err)}`)
				this.instructionText.setColor('#ff0000')
				this.time.delayedCall(2000, () => {
					this.instructionText.setColor('#ffff00')
				})
			}
		} else {
			console.warn('[Level7] No spell equipped. Use TAB to create a spell.')
			this.instructionText.setText('No spell equipped! Press TAB to create one.')
			this.instructionText.setColor('#ffaa00')
		}
	}

	private throwBallManually() {
		if (!this.currentBall) {
			this.instructionText.setText('No ball collected! Collect a ball first.')
			this.instructionText.setColor('#ffaa00')
			this.time.delayedCall(2000, () => {
				this.instructionText.setColor('#ffff00')
			})
			return
		}

		if (this.currentTask === 'task1') {
			if (!this.gate) {
				return
			}
			// Allow throwing any ball - check will happen when it reaches the gate
			this.throwBallToGate()
			this.instructionText.setText('Throwing ball to gate...')
			this.instructionText.setColor('#ffff00')
		} else {
			// Task 2: Throw to the nearest gate (player should use spell to determine which gate)
			// For now, throw to the center gate (user's spell should guide which gate to aim for)
			const nearestGate = this.findNearestGate()
			if (nearestGate) {
				this.throwBallToGateTask2(nearestGate)
				this.instructionText.setText('Throwing ball to gate...')
				this.instructionText.setColor('#ffff00')
			}
		}
	}

	private throwBallToGate() {
		if (!this.currentBall || !this.gate) return

		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
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

	private throwBallToGateTask2(gate: Gate) {
		if (!this.currentBall) return

		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
		if (!ballBody) return

		const gateX = gate.rect.x
		const gateY = gate.rect.y

		// Calculate direction to gate
		const dx = gateX - ballBody.x
		const dy = gateY - ballBody.y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1

		// Set velocity toward gate
		const speed = 300
		ballBody.setVelocity((dx / dist) * speed, (dy / dist) * speed)
	}

	private findNearestGate(): Gate | null {
		if (!this.currentBall || this.gates.length === 0) return null

		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
		if (!ballBody) return null

		let nearestGate: Gate | null = null
		let minDist = Infinity

		this.gates.forEach(gate => {
			const dx = gate.rect.x - ballBody.x
			const dy = gate.rect.y - ballBody.y
			const dist = Math.sqrt(dx * dx + dy * dy)
			if (dist < minDist) {
				minDist = dist
				nearestGate = gate
			}
		})

		return nearestGate
	}

	private isAnyGateActivated(): boolean {
		if (this.currentTask === 'task1') {
			return this.gate && this.gate.activated
		} else {
			// Task 2: Gates are reusable, so we check if ball is currently being thrown
			// by checking if it has velocity
			if (this.currentBall) {
				const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
				if (ballBody && ballBody.body) {
					const hasVelocity = ballBody.body.velocity.x !== 0 || ballBody.body.velocity.y !== 0
					return hasVelocity
				}
			}
			return false
		}
	}

	private createTutorialPanel() {
		const panelWidth = 500
		const panelHeight = 400
		const panelX = 480
		const panelY = 270

		// Create background
		const bg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a1a, 0.95)
		bg.setStrokeStyle(3, 0xffffff)
		bg.setScrollFactor(0)
		bg.setDepth(2000)

		// Create title
		const title = this.add.text(panelX, panelY - 170, 'Programming Concepts Tutorial', {
			fontSize: '20px',
			color: '#ffff00',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)

		// Create content text (will be updated based on page)
		this.tutorialContentText = this.add.text(panelX, panelY - 120, '', {
			fontSize: '12px',
			color: '#ffffff',
			align: 'left',
			lineSpacing: 4,
			wordWrap: { width: panelWidth - 40 },
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2001)

		// Create page indicator
		this.tutorialPageIndicator = this.add.text(panelX, panelY + 160, '', {
			fontSize: '14px',
			color: '#aaaaaa',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)

		// Create navigation buttons
		this.tutorialPrevBtn = this.add.text(panelX - 150, panelY + 160, '← Previous', {
			fontSize: '14px',
			color: '#4a90e2',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)
		this.tutorialPrevBtn.setInteractive({ useHandCursor: true })
		this.tutorialPrevBtn.on('pointerdown', () => {
			this.changeTutorialPage(-1)
		})
		this.tutorialPrevBtn.on('pointerover', () => {
			this.tutorialPrevBtn.setColor('#5aa0f2')
		})
		this.tutorialPrevBtn.on('pointerout', () => {
			this.tutorialPrevBtn.setColor('#4a90e2')
		})

		this.tutorialNextBtn = this.add.text(panelX + 150, panelY + 160, 'Next →', {
			fontSize: '14px',
			color: '#4a90e2',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2001)
		this.tutorialNextBtn.setInteractive({ useHandCursor: true })
		this.tutorialNextBtn.on('pointerdown', () => {
			this.changeTutorialPage(1)
		})
		this.tutorialNextBtn.on('pointerover', () => {
			this.tutorialNextBtn.setColor('#5aa0f2')
		})
		this.tutorialNextBtn.on('pointerout', () => {
			this.tutorialNextBtn.setColor('#4a90e2')
		})

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
		this.tutorialPanel = this.add.container(0, 0, [
			bg, 
			title, 
			this.tutorialContentText, 
			this.tutorialPageIndicator,
			this.tutorialPrevBtn,
			this.tutorialNextBtn,
			closeBtn
		])
		this.tutorialPanel.setVisible(false)
		this.tutorialPanel.setScrollFactor(0)

		// Set initial page
		this.updateTutorialPage()
	}

	private getTutorialPageContent(page: number): string[] {
		const pages = [
			// Page 1: What is an Object?
			[
				'🏗️ WHAT IS AN OBJECT?',
				'',
				'An object is a thing that exists in the game world.',
				'Think of it like a real-world object:',
				'',
				'  • A ball is an object',
				'  • A player is an object',
				'  • A car is an object',
				'  • A door is an object',
				'',
				'In programming, objects can have:',
				'  • Attributes (properties/data)',
				'  • Behaviors (actions/functions)',
				'',
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
				'',
				'Example: A Car Object',
				'  • Attributes: color, speed, fuelLevel',
				'  • Behaviors: drive(), brake(), honk()',
			],
			// Page 2: What is an Attribute?
			[
				'📊 WHAT IS AN ATTRIBUTE?',
				'',
				'An attribute (also called a property) is a piece of',
				'data that belongs to an object. It describes the object.',
				'',
				'Think of attributes as characteristics or qualities',
				'that make each object unique.',
				'',
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
				'',
				'Example: A Ball Object',
				'  • weight = 15 (the ball weighs 15 units)',
				'  • color = "blue"',
				'  • size = 20',
				'',
				'In code: ball.weight = 15',
				'',
				'Different ball objects can have different weights:',
				'  • ball1.weight = 15',
				'  • ball2.weight = 31',
			],
			// Page 3: What is a Class?
			[
				'🎓 WHAT IS A CLASS?',
				'',
				'A class is like a blueprint or template that defines',
				'what attributes and behaviors objects will have.',
				'',
				'Think of it like:',
				'  • Class = Cookie cutter (the template)',
				'  • Object = Cookie (the actual thing)',
				'',
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
				'',
				'In this level:',
				'  • "Ball" is the class (the blueprint)',
				'  • Each ball you see is an object (instance)',
				'  • Each ball has a "weight" attribute',
				'',
				'Functions to access attributes:',
				'  • getWeight() - shows you the weight',
				'  • measureWeight() - measures weight but',
				'    doesn\'t show it (your spell can use it!)',
			],
		]
		return pages[page] || []
	}

	private updateTutorialPage() {
		const content = this.getTutorialPageContent(this.tutorialCurrentPage)
		this.tutorialContentText.setText(content)
		this.tutorialPageIndicator.setText(`Page ${this.tutorialCurrentPage + 1} / ${this.tutorialTotalPages}`)
		
		// Update button visibility
		this.tutorialPrevBtn.setVisible(this.tutorialCurrentPage > 0)
		this.tutorialNextBtn.setVisible(this.tutorialCurrentPage < this.tutorialTotalPages - 1)
	}

	private changeTutorialPage(delta: number) {
		this.tutorialCurrentPage += delta
		if (this.tutorialCurrentPage < 0) {
			this.tutorialCurrentPage = 0
		}
		if (this.tutorialCurrentPage >= this.tutorialTotalPages) {
			this.tutorialCurrentPage = this.tutorialTotalPages - 1
		}
		this.updateTutorialPage()
	}

	private showPreGameTutorial() {
		const panelWidth = 600
		const panelHeight = 450
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
		const title = this.add.text(panelX, panelY - 200, '📚 Programming Concepts Tutorial', {
			fontSize: '24px',
			color: '#ffff00',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(3002)

		// Create content
		const content = [
			'Before you start, let\'s learn some basic concepts:',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🏗️ WHAT IS AN OBJECT?',
			'',
			'An object is a thing that exists in the game world.',
			'Think of it like a real-world object:',
			'  • A ball is an object',
			'  • A player is an object',
			'  • A gate is an object',
			'',
			'In programming, objects can have:',
			'  • Attributes (properties/data)',
			'  • Behaviors (actions/functions)',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'📊 WHAT IS AN ATTRIBUTE?',
			'',
			'An attribute (also called a property) is a piece of',
			'data that belongs to an object. It describes the object.',
			'',
			'Example: A ball object has a "weight" attribute.',
			'  • The ball is the object',
			'  • Weight is the attribute (e.g., 15, 23, 31)',
			'',
			'In code: ball.weight = 15',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'In this level:',
			'  • Each ball is an object',
			'  • Each ball has a "weight" attribute',
			'  • getWeight() returns the weight attribute of',
			'    the currently collected ball object',
		]

		const contentText = this.add.text(panelX, panelY - 150, content, {
			fontSize: '13px',
			color: '#ffffff',
			align: 'left',
			lineSpacing: 5,
			wordWrap: { width: panelWidth - 60 },
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(3002)

		// Create continue button
		const continueBtn = this.add.rectangle(panelX, panelY + 180, 200, 50, 0x4a90e2, 1)
		continueBtn.setStrokeStyle(2, 0xffffff)
		continueBtn.setScrollFactor(0).setDepth(3002)
		continueBtn.setInteractive({ useHandCursor: true })

		const continueText = this.add.text(panelX, panelY + 180, 'Continue to Game', {
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
				'【Level 7: Object-Oriented Programming】\n\n' +
				'This level has TWO tasks to teach you about classes, objects, and attributes.\n\n' +
				'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
				'TASK 1: Find the Heaviest Ball\n\n' +
				'GOAL: Find the heaviest ball and throw it to the gate.\n' +
				'ALLOWED NODES: getWeight(), Output\n\n' +
				'STEPS:\n' +
				'1. Collect a ball by walking into it (only one at a time)\n' +
				'2. Press TAB to open editor\n' +
				'3. Use getWeight() to check the weight of the collected ball\n' +
				'4. Connect getWeight() to Output and cast the spell (press 1)\n' +
				'5. If not the heaviest, collect another ball (old one discarded)\n' +
				'6. When you find the heaviest, press SPACE to throw it!\n\n' +
				'NOTE: Only one ball can be collected at a time.\n' +
				'Press T to toggle tutorial about attributes and classes/objects.'
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
			if (this.currentTask === 'task1') {
				if (this.currentBall) {
					this.instructionText.setText('Task 1: Ball collected! Use getWeight() to check its weight, or collect another ball.')
				} else {
					this.instructionText.setText('Task 1: Collect a ball and use getWeight() to check its weight!')
				}
			} else {
				if (this.currentBall) {
					this.instructionText.setText('Task 2: Ball collected! Use measureWeight() and comparison operators!')
				} else {
					this.instructionText.setText('Task 2: Collect a ball and use measureWeight() with comparison!')
				}
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
		// If player already has a ball, discard it first
		if (this.currentBall && this.currentBall !== ball) {
			this.discardBall(this.currentBall)
			// Reset weight revealed flag when discarding old ball
			this.weightRevealed = false
		}

		// Collect the new ball
		ball.collected = true
		this.currentBall = ball

		// Update level data with current ball weight (but don't reveal it yet in Task 1)
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentBallWeight = ball.weight
		
		// Reset weight revealed flag - player must cast spell to see weight
		this.weightRevealed = false
		
		// Update weight display text based on task
		if (this.currentTask === 'task1') {
			this.currentWeightText.setText('Current ball weight: (Cast getWeight() spell to reveal)')
			this.currentWeightText.setColor('#888888')
		} else {
			this.currentWeightText.setText(`Threshold: ${this.thresholdWeight} (Use measureWeight() and comparison operators)`)
			this.currentWeightText.setColor('#00aaff')
		}

		// Show the ball body and position it near player
		const ballBody = this.world.resources.bodies.get(ball.eid)
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (ballBody && playerBody) {
			ballBody.setVisible(true)
			ballBody.setPosition(playerBody.x + 30, playerBody.y)
			ballBody.setVelocity(0, 0)
		}

		// Remove visual marker and label of collected ball
		ball.marker.destroy()
		ball.label.destroy()
		ball.collector.destroy()

		// Update instruction based on task
		if (this.currentTask === 'task1') {
			this.instructionText.setText('Ball collected! Use getWeight() to check its weight, or collect another ball.')
		} else {
			this.instructionText.setText('Ball collected! Use measureWeight() and comparison operators to classify!')
		}
		this.instructionText.setColor('#ffff00')
	}

	private discardBall(ball: Ball) {
		ball.collected = false

		// Hide the ball body and reset position
		const ballBody = this.world.resources.bodies.get(ball.eid)
		if (ballBody) {
			ballBody.setVisible(false)
			ballBody.setVelocity(0, 0)
			ballBody.setPosition(ball.originalX, ball.originalY)
		}

		// Restore visual marker and label at original position (weight still hidden)
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
	}

	private checkGateActivation() {
		if (!this.currentBall || !this.gate || this.gate.activated || this.ballReturning) return

		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
		if (!ballBody) return

		const gateX = this.gate.rect.x
		const gateY = this.gate.rect.y
		const dx = ballBody.x - gateX
		const dy = ballBody.y - gateY
		const dist = Math.sqrt(dx * dx + dy * dy)

		// Check if ball reached the gate
		if (dist < 40) {
			if (this.currentBall.weight === this.heaviestWeight) {
				// Correct ball - success!
				this.gate.activated = true
				this.gate.rect.setFillStyle(0x00ff00, 0.8)
				ballBody.setVelocity(0, 0)
				this.completeObjectiveById('task1-heaviest')
				this.instructionText.setText('Task 1 Complete! Heaviest ball thrown to gate!')
				this.instructionText.setColor('#00ff00')
				this.cameras.main.flash(200, 0, 255, 0)
				
				// Start Task 2 after a delay
				this.time.delayedCall(3000, () => {
					this.startTask2()
				})
			} else {
				// Wrong ball - return it to original position
				this.returnBallToOriginalPosition(this.currentBall)
				this.instructionText.setText('WRONG! This ball is not the heaviest. Pick another ball and try again!')
				this.instructionText.setColor('#ff0000')
				this.cameras.main.flash(200, 255, 0, 0)
				this.time.delayedCall(3000, () => {
					this.instructionText.setText('Task 1: Collect a ball and use getWeight() to check its weight!')
					this.instructionText.setColor('#ffff00')
				})
			}
		}
	}

	private checkGateActivationTask2(gate: Gate) {
		// Skip if gate was just activated (still showing visual feedback)
		if (gate.activated) return
		
		if (!this.currentBall || this.ballReturning) return

		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
		if (!ballBody) return

		const gateX = gate.rect.x
		const gateY = gate.rect.y
		const dx = ballBody.x - gateX
		const dy = ballBody.y - gateY
		const dist = Math.sqrt(dx * dx + dy * dy)

		// Check if ball reached the gate
		if (dist < 60) {
			const ballWeight = this.currentBall.weight
			const threshold = this.thresholdWeight
			let correctCategory: 'heavier' | 'lighter' | 'equal'

			if (ballWeight > threshold) {
				correctCategory = 'heavier'
			} else if (ballWeight < threshold) {
				correctCategory = 'lighter'
			} else {
				correctCategory = 'equal'
			}

			if (gate.category === correctCategory) {
				// Correct gate! Mark as activated immediately to prevent double-trigger
				gate.activated = true
				// Don't change gate color - keep original color
				ballBody.setVelocity(0, 0)
				
				// Destroy the ball body completely
				ballBody.destroy()
				
				// Remove ball from array
				const ballIndex = this.balls.indexOf(this.currentBall)
				if (ballIndex > -1) {
					this.balls.splice(ballIndex, 1)
				}
				this.currentBall = null
				
				// Clear weight data (never show weight to prevent trial and error)
				if (this.world.resources.levelData) {
					this.world.resources.levelData.currentBallWeight = null
				}
				
				// Reset gate activation after a short delay so it can accept next ball
				this.time.delayedCall(500, () => {
					gate.activated = false
				})

				this.instructionText.setText(`Correct! Ball classified as ${correctCategory.toUpperCase()}. Collect next ball!`)
				this.instructionText.setColor('#00ff00')
				this.cameras.main.flash(200, 0, 255, 0)

				// Check if all balls are classified
				if (this.balls.length === 0) {
					this.completeObjectiveById('task2-classify')
					this.instructionText.setText('Task 2 Complete! All balls classified correctly! Level Complete!')
					this.instructionText.setColor('#00ff00')
					this.cameras.main.flash(500, 0, 255, 0)
				} else {
					this.time.delayedCall(2000, () => {
						this.instructionText.setText(`Task 2: ${this.balls.length} balls remaining. Use measureWeight() and comparison!`)
						this.instructionText.setColor('#ffff00')
					})
				}
			} else {
				// Wrong gate - return ball (don't show weight OR correct answer to prevent trial and error)
				this.returnBallToOriginalPosition(this.currentBall)
				this.instructionText.setText(`WRONG gate! Check your spell logic and try again.`)
				this.instructionText.setColor('#ff0000')
				this.cameras.main.flash(200, 255, 0, 0)
				this.time.delayedCall(3000, () => {
					this.instructionText.setText('Task 2: Use measureWeight() and comparison to classify the ball!')
					this.instructionText.setColor('#ffff00')
				})
			}
		}
	}

	private returnBallToOriginalPosition(ball: Ball) {
		const ballBody = this.world.resources.bodies.get(ball.eid)
		if (!ballBody) return

		// Set flag to prevent multiple triggers
		this.ballReturning = true

		// Stop the ball
		ballBody.setVelocity(0, 0)

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
				ball.collected = false
				this.currentBall = null

				// Clear current weight and reset revealed flag
				if (this.world.resources.levelData) {
					this.world.resources.levelData.currentBallWeight = null
				}
				this.weightRevealed = false
				
				// Update weight display text
				if (this.currentTask === 'task1') {
					this.currentWeightText.setText('Current ball weight: (Cast getWeight() spell to reveal)')
					this.currentWeightText.setColor('#888888')
				}

				// Restore visual marker and label
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

	private startTask2() {
		this.currentTask = 'task2'
		
		// Update levelData to indicate we're in Task 2 (for hudSystem to check)
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentTask = 'task2'
		
		// Clear existing spell workflow to remove Task 1 nodes
		const storageKey = `spell-workflow-Level7`
		const emptyWorkflow = {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } }
			],
			edges: []
		}
		localStorage.setItem(storageKey, JSON.stringify(emptyWorkflow))
		
		// Update editor restrictions for Task 2
		// Allow measureWeight and comparison operators (no getThreshold - threshold is shown in UI)
		const config = levelRegistry.get('Level7')
		if (config) {
			Object.assign(config, {
				editorRestrictions: /^(game::measureWeight|std::cmp::gt|std::cmp::lt|std::cmp::gte|std::cmp::lte|std::cmp::eq|std::cmp::neq|logic::if)$/,
				allowedNodeTypes: ['output', 'dynamicFunction', 'literal', 'if'],
			})
		}
		
		// Force editor to reload with new restrictions and cleared workflow
		// Use delay to ensure localStorage update is complete
		this.time.delayedCall(100, () => {
			forceRefreshEditor()
		})
		
		// Hide Task 1 gate
		if (this.gate) {
			this.gate.rect.setVisible(false)
			this.gate.label.setVisible(false)
		}

		// Clear existing balls
		this.balls.forEach(ball => {
			const ballBody = this.world.resources.bodies.get(ball.eid)
			if (ballBody) {
				ballBody.destroy()
			}
			ball.marker?.destroy()
			ball.label?.destroy()
			ball.collector?.destroy()
		})
		this.balls = []
		this.currentBall = null
		this.weightRevealed = false

		// Create new balls for Task 2
		this.createBallsTask2()

		// Create three gates for Task 2
		this.createGatesTask2()

		// Update instruction text
		this.instructionText.setText('Task 2: Use measureWeight() and comparison to classify balls!')
		this.instructionText.setColor('#ffff00')

		// Update weight display
		this.currentWeightText.setText(`Threshold: ${this.thresholdWeight} (Use measureWeight() and comparison operators)`)
		this.currentWeightText.setColor('#00aaff')

		// Show Task 2 instructions after a small delay to ensure everything is initialized
		this.time.delayedCall(200, () => {
			this.showInstruction(
				'【Task 2: Ball Classification Challenge】\n\n' +
				`GOAL: Classify balls by comparing their weight to threshold (${this.thresholdWeight}).\n\n` +
				'INSTRUCTIONS:\n' +
				'1. Collect a ball\n' +
				'2. Use measureWeight() - it returns the weight but you can\'t see it!\n' +
				'3. Use comparison operators (>, <, ==) to compare with threshold\n' +
				`4. The threshold value (${this.thresholdWeight}) is shown in the UI\n` +
				'5. Return "heavier", "lighter", or "equal" based on comparison\n' +
				'6. Press SPACE to throw ball to the nearest gate (aim for correct one!)\n\n' +
				'NOTE: measureWeight() hides the weight from you, but your spell can use it!'
			)
		})
	}

	private createBalls() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540

		// Create 5 balls with different weights (randomized but visible)
		const weights = [15, 8, 23, 5, 31] // Predefined weights for consistency
		const positions = [
			{ x: Math.min(playerBody.x + 200, worldWidth - 50), y: Math.max(playerBody.y - 100, 50) },
			{ x: Math.min(playerBody.x + 350, worldWidth - 50), y: Math.max(playerBody.y - 50, 50) },
			{ x: Math.min(playerBody.x + 500, worldWidth - 50), y: Math.min(playerBody.y + 100, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 150, 50), y: Math.min(playerBody.y + 150, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 300, 50), y: Math.max(playerBody.y - 150, 50) },
		]

		positions.forEach((pos, index) => {
			const weight = weights[index]
			const color = 0x4a90e2 // Blue color for balls

			// Create visual marker (ball) - weight is hidden, player must use getWeight()
			const marker = this.add.circle(pos.x, pos.y, 20, color, 0.8).setStrokeStyle(2, color)
			
			// No label - weight is hidden to make getWeight() meaningful
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
			})
		})
	}

	private createBallsTask2() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540

		// Create balls with weights around threshold (20)
		// Some heavier, some lighter, some equal
		const weights = [25, 15, 20, 30, 10, 20] // Mix of heavier, lighter, equal
		const positions = [
			{ x: Math.min(playerBody.x + 150, worldWidth - 50), y: Math.max(playerBody.y - 80, 50) },
			{ x: Math.min(playerBody.x + 300, worldWidth - 50), y: Math.max(playerBody.y - 30, 50) },
			{ x: Math.min(playerBody.x + 450, worldWidth - 50), y: Math.min(playerBody.y + 80, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 100, 50), y: Math.min(playerBody.y + 120, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 250, 50), y: Math.max(playerBody.y - 100, 50) },
			{ x: Math.max(playerBody.x - 400, 50), y: Math.max(playerBody.y, 50) },
		]

		positions.forEach((pos, index) => {
			const weight = weights[index]
			const color = 0x9966ff // Purple color for Task 2 balls

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

			// Create entity for the ball
			const eid = spawnEntity(this.world)
			const body = createCircleBody(this, `ball-task2-${index}`, color, 20, pos.x, pos.y, 1)
			body.setImmovable(false)
			body.setVisible(false)
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
			})
		})
	}

	private createGatesTask2() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		
		// Create three gates: heavier, lighter, equal
		const gateConfigs: Array<{ x: number; y: number; category: 'heavier' | 'lighter' | 'equal'; color: number; label: string }> = [
			{ x: worldWidth - 100, y: playerBody.y - 150, category: 'heavier', color: 0xff6666, label: 'HEAVIER\n(> 20)' },
			{ x: worldWidth - 100, y: playerBody.y, category: 'equal', color: 0xffff66, label: 'EQUAL\n(= 20)' },
			{ x: worldWidth - 100, y: playerBody.y + 150, category: 'lighter', color: 0x66ff66, label: 'LIGHTER\n(< 20)' },
		]

		gateConfigs.forEach(config => {
			const rect = this.add.rectangle(config.x, config.y, 80, 100, config.color, 0.7)
			rect.setStrokeStyle(3, 0xffffff)
			
			const label = this.add.text(config.x, config.y, config.label, {
				fontSize: '12px',
				color: '#000000',
				fontStyle: 'bold',
				stroke: '#ffffff',
				strokeThickness: 1,
				align: 'center',
			}).setOrigin(0.5)

			this.gates.push({
				rect,
				label,
				activated: false,
				category: config.category,
			})
		})
	}

	/**
	 * Check if the spell AST is just a direct call to measureWeight()
	 * This is to prevent players from seeing the weight value directly in Task 2
	 */
	private isDirectMeasureWeightConnection(ast: any): boolean {
		// Check if the root node is a FunctionCall to measureWeight
		if (ast.type === 'FunctionCall') {
			// Check if function is measureWeight (could be string or Identifier)
			const funcName = typeof ast.function === 'string' 
				? ast.function 
				: (ast.function?.name || '')
			
			if (funcName === 'game::measureWeight' || funcName === 'measureWeight') {
				console.log('[Level7] Detected direct measureWeight() connection')
				return true
			}
		}
		
		return false
	}
}
