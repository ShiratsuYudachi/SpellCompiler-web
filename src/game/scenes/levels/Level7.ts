/**
 * Level 7 - Weight Finding Challenge
 *
 * Programming concept: Use getWeight() to find the heaviest ball
 * Level design: Player collects balls one at a time, uses getWeight() to check weight, and throws the heaviest ball to a gate
 * 
 * Learning objectives:
 * - Use getWeight() to get the weight of the currently collected ball
 * - Understand that only one ball can be collected at a time
 * - Find the heaviest ball and throw it to the gate to pass
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
}

interface Gate {
	rect: Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	activated: boolean
}

export class Level7 extends BaseScene {
	private balls: Ball[] = []
	private gate!: Gate
	private instructionText!: Phaser.GameObjects.Text
	private currentWeightText!: Phaser.GameObjects.Text
	private tutorialPanel!: Phaser.GameObjects.Container
	private tutorialVisible: boolean = false
	private currentBall: Ball | null = null
	private heaviestWeight: number = 0
	private ballReturning: boolean = false
	private minimapBallDots: Phaser.GameObjects.Arc[] = []
	private weightRevealed: boolean = false // Track if weight has been revealed by casting spell

	constructor() {
		super({ key: 'Level7' })
	}

	protected onLevelCreate(): void {
		// Initialize current ball weight in level data
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentBallWeight = null

		// Show pre-game tutorial first
		this.showPreGameTutorial()

		// Create balls with different weights
		this.createBalls()

		// Calculate heaviest weight from all balls
		this.heaviestWeight = Math.max(...this.balls.map(b => b.weight))

		// Create gate
		this.createGate()

		// Create instruction panel
		this.instructionText = this.add.text(20, 100, 'Collect a ball and use getWeight() to check its weight!', {
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
		// Update current weight display - only show if weight has been revealed by casting spell
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

		// Keep collected ball near player (only if not being thrown)
		if (this.currentBall) {
			const ballBody = this.world.resources.bodies.get(this.currentBall.eid)
			const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
			if (ballBody && playerBody) {
				const body = ballBody.body
				if (body && body.velocity.x === 0 && body.velocity.y === 0 && !this.gate.activated) {
					// If ball is not being thrown and gate is not activated, keep it near player
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

		// Check if gate is activated
		if (this.gate && !this.gate.activated) {
			this.checkGateActivation()
		}
	}

	private castSpell() {
		const playerEid = this.world.resources.playerEid
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				const result = castSpell(this.world, playerEid, spell)
				console.log('[Level7] Spell cast successfully, result:', result)

				// Display weight result - weight is now revealed
				if (typeof result === 'number') {
					// Mark weight as revealed
					this.weightRevealed = true
					
					// Update weight display text color to visible
					this.currentWeightText.setColor('#00ff00')
					
					if (result === this.heaviestWeight && this.currentBall) {
						this.instructionText.setText(`Ball weight: ${result}. This is the heaviest! Press SPACE to throw it at the gate!`)
						this.instructionText.setColor('#00ff00')
					} else {
						this.instructionText.setText(`Ball weight: ${result}. ${result === this.heaviestWeight ? 'This is the heaviest! Press SPACE to throw it at the gate!' : 'Keep searching for a heavier one!'}`)
						this.instructionText.setColor(result === this.heaviestWeight ? '#00ff00' : '#ffff00')
					}
				} else {
					this.instructionText.setText('Error: Spell should return a number (weight)')
					this.instructionText.setColor('#ff0000')
					this.time.delayedCall(2000, () => {
						this.instructionText.setColor('#ffff00')
					})
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
		if (!this.currentBall || !this.gate) {
			this.instructionText.setText('No ball collected! Collect a ball first.')
			this.instructionText.setColor('#ffaa00')
			this.time.delayedCall(2000, () => {
				this.instructionText.setColor('#ffff00')
			})
			return
		}

		// Allow throwing any ball - check will happen when it reaches the gate
		this.throwBallToGate()
		this.instructionText.setText('Throwing ball to gate...')
		this.instructionText.setColor('#ffff00')
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

		// Create content
		const content = [
			'📚 WHAT IS AN ATTRIBUTE?',
			'',
			'An attribute (also called a property) is a piece of',
			'data that belongs to an object. Think of it like a',
			'characteristic or quality.',
			'',
			'Example: A ball has a "weight" attribute.',
			'  • The ball is the object',
			'  • Weight is the attribute (e.g., 15, 23, 31)',
			'',
			'In code: ball.weight = 15',
			'',
			'━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
			'',
			'🏗️ WHAT IS A CLASS / OBJECT?',
			'',
			'A class is like a blueprint or template that defines',
			'what attributes and behaviors an object will have.',
			'',
			'An object is an instance (a specific example) of a class.',
			'',
			'Example:',
			'  • Class: "Ball" (the blueprint)',
			'  • Object: A specific ball with weight=15',
			'',
			'Think of it like:',
			'  • Class = Cookie cutter',
			'  • Object = The actual cookie',
			'',
			'In this level:',
			'  • Each ball is an object of the "Ball" class',
			'  • Each ball has a "weight" attribute',
			'  • getWeight() returns the weight attribute of',
			'    the currently collected ball object',
		]

		const contentText = this.add.text(panelX, panelY - 120, content, {
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
				'【Level 7: Weight Finding Challenge】\n\n' +
				'GOAL: Find the heaviest ball and throw it to the gate.\n\n' +
				'STEP-BY-STEP GUIDE:\n' +
				'1. Collect a ball by walking into it (only one at a time)\n' +
				'2. Press TAB to open editor\n' +
				'3. Use getWeight() to check the weight of the collected ball\n' +
				'4. Connect getWeight() to Output and cast the spell (press 1)\n' +
				'5. If it\'s not the heaviest, collect another ball (old one will be discarded)\n' +
				'6. When you find the heaviest ball, press SPACE to throw it at the gate!\n\n' +
				'NOTE: You can only collect one ball at a time. Collecting a new ball discards the old one.\n' +
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
			if (this.currentBall) {
				this.instructionText.setText('Ball collected! Use getWeight() to check its weight, or collect another ball.')
			} else {
				this.instructionText.setText('Collect a ball and use getWeight() to check its weight!')
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

		// Update level data with current ball weight (but don't reveal it yet)
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.currentBallWeight = ball.weight
		
		// Reset weight revealed flag - player must cast spell to see weight
		this.weightRevealed = false
		
		// Update weight display text to hidden state
		this.currentWeightText.setText('Current ball weight: (Cast getWeight() spell to reveal)')
		this.currentWeightText.setColor('#888888')

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

		// Update instruction - don't reveal weight
		this.instructionText.setText('Ball collected! Use getWeight() to check its weight, or collect another ball.')
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
				this.completeObjectiveById('throw-heaviest')
				this.instructionText.setText('SUCCESS! Heaviest ball thrown to gate! Level complete!')
				this.instructionText.setColor('#00ff00')
				this.cameras.main.flash(200, 0, 255, 0)
			} else {
				// Wrong ball - return it to original position
				this.returnBallToOriginalPosition(this.currentBall)
				this.instructionText.setText('WRONG! This ball is not the heaviest. Pick another ball and try again!')
				this.instructionText.setColor('#ff0000')
				this.cameras.main.flash(200, 255, 0, 0)
				this.time.delayedCall(3000, () => {
					this.instructionText.setText('Collect a ball and use getWeight() to check its weight!')
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
				this.currentWeightText.setText('Current ball weight: (Cast getWeight() spell to reveal)')
				this.currentWeightText.setColor('#888888')

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
}
