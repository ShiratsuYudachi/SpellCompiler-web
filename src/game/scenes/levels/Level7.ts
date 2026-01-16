/**
 * Level 7 - Sorting Challenge（排序挑战）
 *
 * 编程概念：使用列表操作和排序函数对收集到的球的重量进行排序
 * 关卡设计：玩家收集多个带有不同重量的球，然后使用排序函数对重量列表进行排序
 * 
 * 学习目标：
 * - 使用 getCollectedBallWeights 获取收集到的球的重量列表
 * - 使用 std::list::sort 对列表进行排序
 * - 理解排序算法在计算机科学中的应用
 */

import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Sprite } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { castSpell } from '../../spells/castSpell'

interface Ball {
	eid: number
	weight: number
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	collector: Phaser.Physics.Arcade.Image
	collected: boolean
}

export class Level7 extends BaseScene {
	private balls: Ball[] = []
	private instructionText!: Phaser.GameObjects.Text
	private collectedWeightsText!: Phaser.GameObjects.Text
	private sortedWeightsText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level7' })
	}

	protected onLevelCreate(): void {
		// Initialize collected ball weights in level data
		if (!this.world.resources.levelData) {
			this.world.resources.levelData = {}
		}
		this.world.resources.levelData.collectedBallWeights = []

		this.showInstruction(
			'【Level 7: Sorting Challenge】\n\n' +
			'GOAL: Collect all balls and sort their weights in ascending order.\n\n' +
			'STEP-BY-STEP GUIDE:\n' +
			'1. Collect all 5 balls by walking into them\n' +
			'2. Press TAB to open editor\n' +
			'3. Use getCollectedBallWeights to get the list of weights\n' +
			'4. Use std::list::sort to sort the weights\n' +
			'5. Connect the sorted list to Output\n' +
			'6. Click "Register Spell" and press 1 to cast!\n\n' +
			'NOTE: The sorted weights should be in ascending order (smallest to largest).'
		)

		// Create balls with different weights
		this.createBalls()

		// Create instruction panel
		this.instructionText = this.add.text(20, 100, 'Collect all balls, then sort their weights!', {
			fontSize: '14px',
			color: '#ffff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create collected weights display
		this.collectedWeightsText = this.add.text(20, 130, 'Collected weights: []', {
			fontSize: '12px',
			color: '#00ff00',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Create sorted weights display (will be updated when spell is cast)
		this.sortedWeightsText = this.add.text(20, 160, 'Sorted weights: (cast spell to see result)', {
			fontSize: '12px',
			color: '#00aaff',
			backgroundColor: '#333333',
			padding: { x: 8, y: 4 },
		}).setScrollFactor(0).setDepth(1000)

		// Bind key '1' to cast spell
		this.input.keyboard?.on('keydown-ONE', () => {
			this.castSpell()
		})

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		// Update collected weights display
		const weights = this.world.resources.levelData?.collectedBallWeights || []
		this.collectedWeightsText.setText(`Collected weights: [${weights.join(', ')}]`)

		// Check if all balls are collected
		const allCollected = this.balls.every(ball => ball.collected)
		if (allCollected && this.balls.length > 0) {
			this.instructionText.setText('All balls collected! Now sort the weights and cast the spell!')
			this.instructionText.setColor('#00ff00')
		}
	}

	private castSpell() {
		const playerEid = this.world.resources.playerEid
		const spell = this.world.resources.spellByEid.get(playerEid)
		if (spell) {
			try {
				const result = castSpell(this.world, playerEid, spell)
				console.log('[Level7] Spell cast successfully, result:', result)

				// Display sorted result
				if (Array.isArray(result)) {
					const sorted = result as number[]
					this.sortedWeightsText.setText(`Sorted weights: [${sorted.join(', ')}]`)
					
					// Check if sorted correctly
					const weights = this.world.resources.levelData?.collectedBallWeights || []
					const expectedSorted = [...weights].sort((a, b) => a - b)
					
					if (sorted.length === expectedSorted.length && 
						sorted.every((val, idx) => val === expectedSorted[idx])) {
						this.completeObjectiveById('sort-weights')
						this.instructionText.setText('SUCCESS! Weights sorted correctly! Level complete!')
						this.instructionText.setColor('#00ff00')
						this.cameras.main.flash(200, 0, 255, 0)
					} else {
						this.instructionText.setText('The weights are not sorted correctly. Try again!')
						this.instructionText.setColor('#ff0000')
						this.time.delayedCall(2000, () => {
							this.instructionText.setColor('#ffff00')
						})
					}
				} else {
					this.instructionText.setText('Error: Spell should return a sorted list of weights')
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

			// Create visual marker (ball)
			const marker = this.add.circle(pos.x, pos.y, 20, color, 0.8).setStrokeStyle(2, color)
			
			// Create label showing weight
			const label = this.add.text(pos.x, pos.y - 35, `Weight: ${weight}`, {
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
						ball.collected = true

						// Add weight to collected list
						if (!this.world.resources.levelData) {
							this.world.resources.levelData = {}
						}
						if (!this.world.resources.levelData.collectedBallWeights) {
							this.world.resources.levelData.collectedBallWeights = []
						}
						this.world.resources.levelData.collectedBallWeights.push(weight)

						// Remove visual elements
						ball.marker.destroy()
						ball.label.destroy()
						ball.collector.destroy()

						// Update objective
						const count = this.balls.filter((b) => b.collected).length
						this.updateObjectiveDescription('collect-balls', `Collect all balls (${count}/${this.balls.length})`)

						// Check if all collected
						if (count === this.balls.length) {
							this.completeObjectiveById('collect-balls')
						}
					}
				}
			)

			// Create entity for the ball (optional, for potential future use)
			const eid = spawnEntity(this.world)
			const body = createRectBody(this, 'ball', color, 40, 40, pos.x, pos.y, 1)
			body.setImmovable(true)
			this.world.resources.bodies.set(eid, body)
			addComponent(this.world, eid, Sprite)

			this.balls.push({
				eid,
				weight,
				marker,
				label,
				collector,
				collected: false,
			})
		})
	}
}
