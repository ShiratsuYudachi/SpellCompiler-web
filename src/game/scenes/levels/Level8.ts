/**
 * Level 8 - Manual Sorting with Variable Storage
 *
 * Programming concept: Use measureWeight() with comparison operators and temporary storage to manually sort balls
 * Level design: Player collects balls one at a time, uses slot1/slot2 to store weights, compares and throws in ascending order
 * 
 * Learning objectives:
 * - Understand variables/temporary storage (slot1, slot2)
 * - Use setSlot() and getSlot() to store and retrieve values
 * - Implement manual sorting algorithm (selection sort)
 * - Use comparison operators (gt, lt) to make decisions
 * - Throw balls in correct ascending order to numbered gates
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Sprite } from '../../components'
import { createCircleBody } from '../../prefabs/createCircleBody'
import { castSpell } from '../../spells/castSpell'
import { updateSceneConfig } from '../sceneConfig'
import { forceRefreshEditor } from '../../gameInstance'

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
	expectedOrder: number  // 1, 2, 3, 4
	receivedWeight: number | null
}

export class Level8 extends BaseScene {
	private balls: Ball[] = []
	private currentBall: Ball | null = null  // Currently collected ball
	private gates: Gate[] = []  // 4 gates
	private instructionText!: Phaser.GameObjects.Text
	private slotDisplayText!: Phaser.GameObjects.Text  // Display slot1, slot2 values
	private currentWeightText!: Phaser.GameObjects.Text  // Display current ball weight (hidden until measured)
	private sortedWeights: number[] = []  // Track thrown balls' weights in order
	private tutorialPanel!: Phaser.GameObjects.Container
	private tutorialBgOverlay!: Phaser.GameObjects.Rectangle
	private tutorialVisible: boolean = false
	private tutorialCurrentPage: number = 0
	private tutorialTotalPages: number = 9  // Combined: 2 pregame pages + 4 tutorial pages + 3 instruction pages
	private tutorialContentText!: Phaser.GameObjects.Text
	private tutorialPageIndicator!: Phaser.GameObjects.Text
	private tutorialPrevBtn!: Phaser.GameObjects.Text
	private tutorialNextBtn!: Phaser.GameObjects.Text
	private tutorialCloseBtn!: Phaser.GameObjects.Text
	private ballReturning: boolean = false
	private minimapBallDots: Phaser.GameObjects.Arc[] = []

	constructor() {
		super({ key: 'Level8' })
	}

	protected onLevelCreate(): void {
		// Reset all state when entering the level (in case scene is reused)
		this.currentBall = null
		this.balls = []
		this.gates = []
		this.sortedWeights = []
		this.ballReturning = false
		this.minimapBallDots = []
		this.tutorialVisible = false
		this.tutorialCurrentPage = 0

		// Reset scene config to Level 8 settings (in case coming from another level)
		updateSceneConfig('Level8', {
			editorRestrictions: /^(game::measureWeight|game::setSlot|game::getSlot|game::clearSlots|std::cmp::.*|std::logic::.*)$/,
			allowedNodeTypes: ['output', 'dynamicFunction', 'literal', 'if'],
		})

		// Clear any old workflow and restore Level 8 default workflow
		const storageKey = `spell-workflow-Level8`
		const defaultWorkflow = {
			nodes: [
				{ id: 'output-1', type: 'output', position: { x: 400, y: 250 }, data: { label: 'Output' } },
				{
					id: 'func-measureWeight',
					type: 'dynamicFunction',
					position: { x: 200, y: 200 },
					data: {
						functionName: 'game::measureWeight',
						displayName: 'measureWeight',
						namespace: 'game',
						params: [],
					},
				},
			],
			edges: [],
		}
		localStorage.setItem(storageKey, JSON.stringify(defaultWorkflow))

		// Force editor to refresh with Level 8 settings
		this.time.delayedCall(50, () => {
			forceRefreshEditor()
		})

		// Initialize level data
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentBallWeight = null
		this.world.resources.levelData.slot1 = null
		this.world.resources.levelData.slot2 = null
		this.world.resources.levelData.collectedBallIndex = 0

		// Create balls with predefined weights
		this.createBalls()

		// Create 4 gates vertically arranged on the right
		this.createGates()

		// Create instruction panel
		this.instructionText = this.add.text(20, 100, 'Sort 4 balls by weight! Use measureWeight() with comparison operators to sort.', {
			fontSize: '14px',
			color: '#ffff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create slot display - values are hidden from players
		this.slotDisplayText = this.add.text(20, 130, 'Slot1: ??? | Slot2: ???', {
			fontSize: '12px',
			color: '#888888',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create current weight display - weight is always hidden (like Level7)
		this.currentWeightText = this.add.text(20, 160, 'Current ball weight: ??? (Use measureWeight() with comparison operators)', {
			fontSize: '12px',
			color: '#888888',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create combined tutorial/instruction panel
		this.createTutorialPanel()

		// Show combined tutorial/instruction panel first (after creating it)
		this.showTutorial()

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
		// Continuously clear spell message to prevent it from showing in HUD
		// Players should not see spell results, slot values, or outputs
		this.world.resources.spellMessageByEid.set(this.world.resources.playerEid, '')

		// Update slot display
		this.updateSlotDisplay()

		// Update current weight display
		this.updateCurrentWeightDisplay()

		// Keep current ball near player
		if (this.currentBall && !this.ballReturning) {
			const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
			const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
			
			if (playerBody && ballBody) {
				// Check if ball has velocity (is being thrown)
				if (ballBody.body && ballBody.body.velocity.x === 0 && ballBody.body.velocity.y === 0) {
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

		// Check all gates for ball arrivals
		this.gates.forEach(gate => {
			if (!gate.activated) {
				this.checkGateActivation(gate)
			}
		})
	}

	private updateSlotDisplay() {
		// Hide slot values from players - they should not see the stored values
		this.slotDisplayText.setText(`Slot1: ??? | Slot2: ???`)
	}

	private updateCurrentWeightDisplay() {
		// Weight is always hidden - never show the actual number (like Level7)
		if (this.currentBall) {
			this.currentWeightText.setText(`Current ball weight: ??? (Use comparison operators to sort)`)
			this.currentWeightText.setColor('#888888')
		} else {
			this.currentWeightText.setText(`Current ball weight: (No ball collected)`)
			this.currentWeightText.setColor('#888888')
		}
	}

	private castSpell() {
		const playerEid = this.world.resources.playerEid
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				// Anti-cheat detection: check if measureWeight() is directly connected to output
				const isDirectMeasureWeight = this.isDirectMeasureWeightConnection(spell.ast)
				if (isDirectMeasureWeight) {
					this.instructionText.setText('ERROR: measureWeight() cannot be directly connected to Output! You must use comparison or storage.')
					this.instructionText.setColor('#ff0000')
					this.time.delayedCall(3000, () => {
						this.instructionText.setText('Use measureWeight() with setSlot() or comparison operators!')
						this.instructionText.setColor('#ffff00')
					})
					return
				}

				// Clear spell message before casting to prevent it from showing
				this.world.resources.spellMessageByEid.set(playerEid, '')
				const result = castSpell(this.world, playerEid, spell)
				console.log('[Level8] Spell cast successfully, result:', result)

				// Don't show spell result - players should not see it
				// Clear any spell message to prevent it from showing in HUD
				// Clear immediately and also in next frame to ensure it's cleared
				this.world.resources.spellMessageByEid.set(playerEid, '')
				this.time.delayedCall(0, () => {
					this.world.resources.spellMessageByEid.set(playerEid, '')
				})
				// Don't show comparison results, slot values, or any outputs
				// Just show a generic message without revealing any result
				this.instructionText.setText(`Spell cast. Press SPACE to throw ball to test your sorting logic.`)
				this.instructionText.setColor('#ffff00')

				this.time.delayedCall(2000, () => {
					if (this.currentBall) {
						this.instructionText.setText('Press SPACE to throw ball to nearest gate.')
					} else {
						this.instructionText.setText('Collect a ball and continue sorting!')
					}
					this.instructionText.setColor('#ffff00')
				})
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

	/**
	 * Check if the spell AST is just a direct call to measureWeight()
	 * This is to prevent players from seeing the weight value directly
	 */
	private isDirectMeasureWeightConnection(ast: any): boolean {
		// Check if the root node is a FunctionCall to measureWeight
		if (ast.type === 'FunctionCall') {
			// Check if function is measureWeight (could be string or Identifier)
			const funcName = typeof ast.function === 'string' 
				? ast.function 
				: (ast.function?.name || '')
			
			if (funcName === 'game::measureWeight' || funcName === 'measureWeight') {
				console.log('[Level8] Detected direct measureWeight() connection')
				return true
			}
		}
		
		return false
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

		// Find nearest gate
		const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
		if (!ballBody) return

		let nearestGate: Gate | undefined = undefined
		let minDist = Infinity

		for (const gate of this.gates) {
			if (!gate.activated) {
				const dx = gate.rect.x - ballBody.x
				const dy = gate.rect.y - ballBody.y
				const dist = Math.sqrt(dx * dx + dy * dy)
				if (dist < minDist) {
					minDist = dist
					nearestGate = gate
				}
			}
		}

		if (nearestGate) {
			this.throwBallToGate(this.currentBall, nearestGate)
			this.instructionText.setText(`Throwing ball to Gate ${nearestGate.expectedOrder}...`)
			this.instructionText.setColor('#ffff00')
		} else {
			this.instructionText.setText('No available gates!')
			this.instructionText.setColor('#ffaa00')
		}
	}

	private throwBallToGate(ball: Ball, gate: Gate) {
		const ballBody = this.world.resources.bodies.get(ball.eid)
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

	private checkGateActivation(gate: Gate) {
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
			ballBody.setVelocity(0, 0)

			// Verify if this ball is thrown in correct order
			const ballWeight = this.currentBall.weight
			
			// Get all ball weights and sort them
			const allWeights = this.balls.map(b => b.weight).sort((a, b) => a - b)
			
			// The expected weight for this gate is the (sortedWeights.length + 1)-th smallest
			const expectedWeight = allWeights[this.sortedWeights.length]
			
			if (ballWeight === expectedWeight) {
				// Correct! This is the next lightest ball
				gate.activated = true
				gate.receivedWeight = ballWeight
				this.sortedWeights.push(ballWeight)
				
				// Destroy the ball body
				ballBody.destroy()
				
				// Remove ball from balls array
				const ballIndex = this.balls.indexOf(this.currentBall)
				if (ballIndex > -1) {
					this.balls.splice(ballIndex, 1)
				}
				
				// Clear current ball
				this.currentBall = null
				if (this.world.resources.levelData) {
					this.world.resources.levelData.currentBallWeight = null
				}
				
				// Flash green
				this.cameras.main.flash(200, 0, 255, 0)
				
				// Check if all balls sorted
				if (this.sortedWeights.length === 4) {
					this.instructionText.setText('SUCCESS! All balls sorted correctly! Level Complete!')
					this.instructionText.setColor('#00ff00')
					
					// Complete the sorting objective
					const sortObjective = this.allObjectives.find(obj => obj.id === 'complete-sort')
					if (sortObjective && !sortObjective.completed) {
						this.completeObjectiveById('complete-sort')
					}
				} else {
					this.instructionText.setText(`Correct! ${4 - this.sortedWeights.length} more ball(s) to sort. Collect next ball!`)
					this.instructionText.setColor('#00ff00')
					
					this.time.delayedCall(2000, () => {
						this.instructionText.setText('Collect next ball and continue sorting!')
						this.instructionText.setColor('#ffff00')
					})
				}
			} else {
				// Wrong! Ball is not in correct order
				// Return ball to original position
				this.returnBallToOriginalPosition(this.currentBall)
				
				// Flash red
				this.cameras.main.flash(200, 255, 0, 0)
				
				// Show error message (without revealing correct answer or weight)
				this.instructionText.setText(`WRONG order! Try again.`)
				this.instructionText.setColor('#ff0000')
				
				this.time.delayedCall(3000, () => {
					this.instructionText.setText('Collect balls and throw in ascending order (lightest to heaviest)!')
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

		// Clear current ball
		this.currentBall = null
		if (this.world.resources.levelData) {
			this.world.resources.levelData.currentBallWeight = null
		}

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

				// Restore visual marker and label at original position
				ball.marker = this.add.circle(ball.originalX, ball.originalY, 20, 0x4a90e2, 0.8).setStrokeStyle(2, 0x4a90e2)
				ball.label = this.add.text(ball.originalX, ball.originalY - 35, '?', {
					fontSize: '12px',
					color: '#ffffff',
					stroke: '#000000',
					strokeThickness: 2,
				}).setOrigin(0.5)

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

	private collectBall(ball: Ball) {
		// Can only collect one ball at a time (similar to Level 7)
		if (this.currentBall) {
			this.instructionText.setText('Already holding a ball! Throw it first (SPACE) before collecting another.')
			this.instructionText.setColor('#ffaa00')
			this.time.delayedCall(2000, () => {
				this.instructionText.setColor('#ffff00')
			})
			return
		}

		if (ball.collected) return

	// Collect the ball
	ball.collected = true
	this.currentBall = ball

	// Update level data with current ball weight
	if (this.world.resources.levelData) {
		this.world.resources.levelData.currentBallWeight = ball.weight
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

		// Update instruction
		this.instructionText.setText(`Ball collected! Use measureWeight() with comparison operators to sort.`)
		this.instructionText.setColor('#ffff00')
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

	private createBalls() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540

		// Create 4 balls with predefined weights (to ensure clear sorting order)
		// Ball A: 15 (2nd lightest)
		// Ball B: 8 (lightest)
		// Ball C: 23 (heaviest)
		// Ball D: 18 (3rd lightest)
		// Correct order: B(8) → A(15) → D(18) → C(23)
		const weights = [15, 8, 23, 18]
		const positions = [
			{ x: Math.min(playerBody.x + 200, worldWidth - 50), y: Math.max(playerBody.y - 100, 50) },
			{ x: Math.min(playerBody.x + 350, worldWidth - 50), y: Math.min(playerBody.y + 100, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 150, 50), y: Math.min(playerBody.y + 150, worldHeight - 50) },
			{ x: Math.max(playerBody.x - 300, 50), y: Math.max(playerBody.y - 150, 50) },
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
			})
		})
	}

	private createGates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const worldWidth = (this as any).worldWidth || 960
		
		// Create 4 gates vertically arranged on the right side
		const gateX = worldWidth - 100
		const gateSpacing = 120
		const startY = playerBody.y - 180

		for (let i = 0; i < 4; i++) {
			const expectedOrder = i + 1
			const gateY = startY + i * gateSpacing
			
			// Color based on order: lightest (green), middle (yellow/orange), heaviest (red)
			let gateColor = 0x888888
			if (i === 0) gateColor = 0x66ff66  // 1st - green (lightest)
			else if (i === 1) gateColor = 0xffff66  // 2nd - yellow
			else if (i === 2) gateColor = 0xffaa66  // 3rd - orange
			else gateColor = 0xff6666  // 4th - red (heaviest)
			
			const rect = this.add.rectangle(gateX, gateY, 80, 100, gateColor, 0.7)
			rect.setStrokeStyle(3, 0xffffff)
			
			const orderSuffix = expectedOrder === 1 ? 'st' : expectedOrder === 2 ? 'nd' : expectedOrder === 3 ? 'rd' : 'th'
			const label = this.add.text(gateX, gateY, `${expectedOrder}${orderSuffix}\n${i === 0 ? '(Lightest)' : i === 3 ? '(Heaviest)' : ''}`, {
				fontSize: '14px',
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
				expectedOrder,
				receivedWeight: null,
			})
		}
	}

	private createTutorialPanel() {
		const panelWidth = 600
		const panelHeight = 450
		const panelX = 480
		const panelY = 270

		// Create background overlay (clickable to close)
		this.tutorialBgOverlay = this.add.rectangle(panelX, panelY, 960, 540, 0x000000, 0.85)
		this.tutorialBgOverlay.setScrollFactor(0).setDepth(2000)
		this.tutorialBgOverlay.setInteractive({ useHandCursor: false })
		this.tutorialBgOverlay.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			// Only close if clicking outside the panel area
			const panelLeft = panelX - panelWidth / 2
			const panelRight = panelX + panelWidth / 2
			const panelTop = panelY - panelHeight / 2
			const panelBottom = panelY + panelHeight / 2
			
			if (pointer.x < panelLeft || pointer.x > panelRight || 
			    pointer.y < panelTop || pointer.y > panelBottom) {
				this.hideTutorial()
			}
		})
		this.tutorialBgOverlay.setVisible(false)

		// Create background panel
		const bg = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a1a, 0.98)
		bg.setStrokeStyle(4, 0x4a90e2)
		bg.setScrollFactor(0).setDepth(2001)

		// Create title
		const title = this.add.text(panelX, panelY - 200, '【Level 8: Sorting Challenge】', {
			fontSize: '24px',
			color: '#ffff00',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2002)

		// Create content text (will be updated based on page) - NOT in container
		this.tutorialContentText = this.add.text(panelX, panelY - 150, '', {
			fontSize: '13px',
			color: '#ffffff',
			align: 'left',
			lineSpacing: 5,
			wordWrap: { width: panelWidth - 60 },
		}).setOrigin(0.5, 0).setScrollFactor(0).setDepth(2002)
		this.tutorialContentText.setVisible(false)

		// Create page indicator - NOT in container
		this.tutorialPageIndicator = this.add.text(panelX, panelY + 180, '', {
			fontSize: '14px',
			color: '#aaaaaa',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2002)
		this.tutorialPageIndicator.setVisible(false)

		// Create navigation buttons - NOT in container
		this.tutorialPrevBtn = this.add.text(panelX - 150, panelY + 180, '← Previous', {
			fontSize: '16px',
			color: '#4a90e2',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2002)
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
		this.tutorialPrevBtn.setVisible(false)

		this.tutorialNextBtn = this.add.text(panelX + 150, panelY + 180, 'Next →', {
			fontSize: '16px',
			color: '#4a90e2',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2002)
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
		this.tutorialNextBtn.setVisible(false)

		// Create close button - NOT in container
		this.tutorialCloseBtn = this.add.text(panelX + panelWidth / 2 - 20, panelY - panelHeight / 2 + 20, '✕', {
			fontSize: '24px',
			color: '#ff6666',
			fontStyle: 'bold',
		}).setOrigin(0.5).setScrollFactor(0).setDepth(2003)
		this.tutorialCloseBtn.setInteractive({ useHandCursor: true })
		this.tutorialCloseBtn.on('pointerdown', () => {
			this.hideTutorial()
		})
		this.tutorialCloseBtn.setVisible(false)

		// Create container (only for static background elements)
		this.tutorialPanel = this.add.container(0, 0, [
			bg,
			title
		])
		this.tutorialPanel.setVisible(false)
		this.tutorialPanel.setScrollFactor(0)
		this.tutorialPanel.setDepth(2001)

		// Set initial page
		this.updateTutorialPage()
	}

	private getTutorialPageContent(page: number): string[] {
		switch (page) {
			// Page 0: Welcome and Goal
			case 0:
				return [
					'Welcome to Level 8! In this level, you\'ll learn about:',
					'  • Variables / Temporary Storage',
					'  • Sorting Algorithms',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'🎯 YOUR GOAL:',
					'',
					'Sort 4 balls by weight and throw them to gates in',
					'ascending order (lightest to heaviest).',
					'',
					'  • 1st gate: Lightest ball',
					'  • 2nd gate: Second lightest',
					'  • 3rd gate: Third lightest',
					'  • 4th gate: Heaviest ball',
				]
			// Page 1: Important Rules
			case 1:
				return [
					'⚠️ IMPORTANT RULES:',
					'',
					'measureWeight() does NOT show you the weight value!',
					'(Just like Level 7, you cannot see the number directly)',
					'',
					'You MUST use comparison operators (gt, lt, eq) to',
					'compare weights and make sorting decisions.',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'KEY FUNCTIONS:',
					'',
					'• measureWeight() - Get weight (hidden from you)',
					'• setSlot(slotId, value) - Store value in slot1/slot2',
					'• getSlot(slotId) - Retrieve value from slot1/slot2',
					'• gt(a, b) / lt(a, b) - Compare two values',
					'',
					'Use if/else logic to decide which ball to throw.',
				]
			// Page 2: What is a Variable
			case 2:
				return [
					'📦 WHAT IS A VARIABLE / TEMPORARY STORAGE?',
					'',
					'A variable is like a labeled box where you can store a value temporarily.',
					'In this level, you have 2 storage slots: slot1 and slot2.',
					'',
					'Think of it like:',
					'  • A notebook where you write down important numbers',
					'  • A container where you put items for safekeeping',
					'  • A memory that helps you remember values',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'⚠️ IMPORTANT:',
					'',
					'measureWeight() does NOT show you the weight!',
					'You cannot see the number directly (like Level 7).',
					'',
					'You MUST use comparison operators to compare:',
					'  • gt(a, b) - is a greater than b?',
					'  • lt(a, b) - is a less than b?',
					'  • eq(a, b) - is a equal to b?',
				]
			// Page 3: Storage Functions
			case 3:
				return [
					'🔧 STORAGE FUNCTIONS',
					'',
					'setSlot(slotId, value)',
					'  • Store a number in slot1 or slot2',
					'  • Example: setSlot(1, measureWeight())',
					'  • The value is stored but you can\'t see it!',
					'',
					'getSlot(slotId)',
					'  • Retrieve the number from slot1 or slot2',
					'  • Example: getSlot(1) returns stored value',
					'  • If slot is empty, returns 0',
					'  • You still can\'t see the number directly!',
					'',
					'clearSlots()',
					'  • Clear all slots (start over)',
					'  • Both slot1 and slot2 become empty',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'Using storage in your spell:',
					'  1. measureWeight() → setSlot(1, ...) to store',
					'  2. Later: getSlot(1) → compare with measureWeight()',
					'  3. Use gt() or lt() to compare (returns true/false)',
					'  4. Use if/else to decide what to do',
				]
			// Page 4: Sorting Strategy
			case 4:
				return [
					'🎯 SORTING STRATEGY',
					'',
					'Goal: Throw balls in order from lightest to heaviest',
					'',
					'Algorithm idea:',
					'1. Collect first ball, measure and store in slot1',
					'   (You can\'t see the weight, but it\'s stored!)',
					'2. Collect second ball, measure it',
					'3. Compare: lt(getSlot(1), measureWeight())',
					'   - Returns true if slot1 < current ball',
					'   - Returns false if slot1 >= current ball',
					'4. Use if/else:',
					'   - If true: throw current ball (it\'s heavier)',
					'   - If false: throw stored ball, store current',
					'5. Repeat until all balls are sorted!',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'Key points:',
					'  • measureWeight() never shows you the number',
					'  • Use gt() or lt() to compare (returns boolean)',
					'  • Use if/else to make decisions',
					'  • Always throw the lightest ball found so far',
				]
			// Page 5: How to Sort - Part 1
			case 5:
				return [
					'HOW TO SORT - Part 1:',
					'',
					'1. Collect a ball by walking into it',
					'   (only one at a time)',
					'',
					'2. Press TAB to open editor',
					'',
					'3. Use measureWeight() to get the weight',
					'   (hidden from you)',
					'',
					'4. Use setSlot(1, measureWeight()) to store it',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'This stores the first ball\'s weight in slot1.',
					'You can\'t see the number, but it\'s stored!',
				]
			// Page 6: How to Sort - Part 2
			case 6:
				return [
					'HOW TO SORT - Part 2:',
					'',
					'5. Collect another ball, measure it',
					'',
					'6. Compare: gt(getSlot(1), measureWeight())',
					'   or lt(getSlot(1), measureWeight())',
					'',
					'7. Use if/else to decide which ball is lighter',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'The comparison returns true/false:',
					'  • gt(a, b) = true if a > b',
					'  • lt(a, b) = true if a < b',
					'  • Use this to decide which ball to throw',
				]
			// Page 7: How to Sort - Part 3
			case 7:
				return [
					'HOW TO SORT - Part 3:',
					'',
					'8. Throw the lighter ball to the next gate',
					'   (press SPACE)',
					'',
					'9. Store the heavier ball in slot1 for',
					'   next comparison',
					'',
					'10. Repeat until all 4 balls are sorted!',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'Strategy:',
					'  • Always throw the lightest ball you\'ve found so far',
					'  • Use storage to remember the lightest weight',
					'  • Compare each new ball with stored weight',
					'  • Update storage if you find a lighter ball',
				]
			// Page 8: Gates and Controls
			case 8:
				return [
					'GATES (in order):',
					'',
					'• 1st gate: Lightest ball',
					'• 2nd gate: Second lightest',
					'• 3rd gate: Third lightest',
					'• 4th gate: Heaviest ball',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'CONTROLS:',
					'',
					'• TAB: Open editor',
					'• 1: Cast spell',
					'• SPACE: Throw ball to nearest gate',
					'• T: Toggle tutorial',
					'',
					'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
					'',
					'IMPORTANT:',
					'  • Only ONE ball at a time',
					'  • Weights are hidden - use comparisons!',
					'  • Sort from lightest to heaviest',
					'  • Press T anytime to view this tutorial again!',
				]
			default:
				return ['Invalid page']
		}
	}

	private updateTutorialPage() {
		const content = this.getTutorialPageContent(this.tutorialCurrentPage)
		if (this.tutorialContentText) {
			this.tutorialContentText.setText(content)
			this.tutorialContentText.setVisible(true)
		}
		if (this.tutorialPageIndicator) {
			this.tutorialPageIndicator.setText(`Page ${this.tutorialCurrentPage + 1} / ${this.tutorialTotalPages}`)
			this.tutorialPageIndicator.setVisible(true)
		}
		
		// Update button visibility
		if (this.tutorialPrevBtn) {
			this.tutorialPrevBtn.setVisible(this.tutorialCurrentPage > 0)
		}
		if (this.tutorialNextBtn) {
			this.tutorialNextBtn.setVisible(this.tutorialCurrentPage < this.tutorialTotalPages - 1)
		}
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

	private showTutorial() {
		// Ensure all elements are created before showing
		if (!this.tutorialBgOverlay || !this.tutorialPanel || !this.tutorialContentText) {
			console.warn('[Level8] Tutorial panel not created yet, creating now...')
			this.createTutorialPanel()
		}
		
		this.tutorialCurrentPage = 0
		this.tutorialVisible = true
		this.tutorialBgOverlay.setVisible(true)
		this.tutorialPanel.setVisible(true)
		this.tutorialContentText.setVisible(true)
		this.tutorialPageIndicator.setVisible(true)
		this.tutorialPrevBtn.setVisible(true)
		this.tutorialNextBtn.setVisible(true)
		this.tutorialCloseBtn.setVisible(true)
		this.updateTutorialPage()
	}

	private hideTutorial() {
		this.tutorialVisible = false
		this.tutorialBgOverlay.setVisible(false)
		this.tutorialPanel.setVisible(false)
		this.tutorialContentText.setVisible(false)
		this.tutorialPageIndicator.setVisible(false)
		this.tutorialPrevBtn.setVisible(false)
		this.tutorialNextBtn.setVisible(false)
		this.tutorialCloseBtn.setVisible(false)
		// Reset to first page when hiding
		this.tutorialCurrentPage = 0
	}

	private toggleTutorial() {
		if (this.tutorialVisible) {
			this.hideTutorial()
			this.instructionText.setText('Tutorial closed. Press T to open again.')
		} else {
			this.showTutorial()
			this.instructionText.setText('Tutorial opened! Press T again to close.')
		}
		this.time.delayedCall(2000, () => {
			if (this.currentBall) {
				this.instructionText.setText('Ball collected! Use measureWeight() with comparison operators to sort.')
			} else {
				this.instructionText.setText('Collect a ball and start sorting!')
			}
			this.instructionText.setColor('#ffff00')
		})
	}

}
