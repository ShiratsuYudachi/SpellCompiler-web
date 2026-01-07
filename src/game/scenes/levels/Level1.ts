import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity, despawnEntity } from '../../gameWorld'
import { Velocity, Health, Sprite } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'

export class Level1 extends BaseScene {
	private bossEid: number | null = null
	private bossDefeated = false
	private bossCoordText!: Phaser.GameObjects.Text
	private bossHealthBarBg!: Phaser.GameObjects.Graphics
	private bossHealthBarFill!: Phaser.GameObjects.Graphics
	private bossHealthText!: Phaser.GameObjects.Text
	private teleportTargets: Array<{
		x: number
		y: number
		marker: Phaser.GameObjects.Arc
		coordText?: Phaser.GameObjects.Text
		collected: boolean
		collector: Phaser.Physics.Arcade.Image
	}> = []
	private minimapMarkerDots: Phaser.GameObjects.Arc[] = []

	constructor() {
		super({ key: 'Level1' })
	}

	protected onLevelCreate(): void {
		// Tutorial hint
		this.showInstruction('【Logic Gate】\nNormal movement is disabled. Press TAB to open the code editor and move by modifying coordinates.')

		// Create Boss
		this.createBoss()

		// Create teleport targets (initially hidden)
		this.createTeleportTargets()
		this.setTeleportTargetsVisible(false)

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}

	protected onLevelUpdate(): void {
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)

		// Logic lock: disable manual velocity before completing all tasks
		if (!this.bossDefeated || this.getCollectedCount() < 3) {
			if (playerBody) playerBody.setVelocity(0, 0)
			Velocity.x[playerEid] = 0
			Velocity.y[playerEid] = 0
		}

		// Boss logic
		if (this.bossEid !== null && !this.bossDefeated) {
			this.updateBossCoordinates()
			this.updateBossHealthUI()
			if (Health.current[this.bossEid] <= 0) {
				this.onBossDefeated()
			}
		}

		// Update teleport target coordinates (only if boss is defeated)
		if (this.bossDefeated) {
			this.updateTeleportTargetCoordinates()
			// Update minimap with teleport targets (only after boss is defeated)
			this.updateMinimapWithTargets()
		}
	}

	private createBoss() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const bossX = playerBody.x + 400
		const bossY = playerBody.y

		const bossBody = createRectBody(this, 'boss', 0xff0000, 64, 64, bossX, bossY, 5)
		bossBody.setImmovable(true)

		this.bossEid = spawnEntity(this.world)
		this.world.resources.bodies.set(this.bossEid, bossBody)
		addComponent(this.world, this.bossEid, Sprite)
		addComponent(this.world, this.bossEid, Health)
		Health.current[this.bossEid] = 100
		Health.max[this.bossEid] = 100

		// Create Boss coordinate text
		this.bossCoordText = this.add
			.text(bossX, bossY + 50, '', { fontSize: '14px', color: '#ff0000' })
			.setOrigin(0.5)

		// Create Boss health bar UI
		this.bossHealthBarBg = this.add.graphics()
		this.bossHealthBarFill = this.add.graphics()
		this.bossHealthText = this.add.text(bossX, bossY - 50, '', {
			fontSize: '16px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4,
		})
		this.bossHealthText.setOrigin(0.5)
	}

	private onBossDefeated() {
		this.bossDefeated = true
		
		// Destroy Boss coordinate text
		this.bossCoordText.destroy()
		
		// Destroy Boss health bar UI
		if (this.bossHealthBarBg) this.bossHealthBarBg.destroy()
		if (this.bossHealthBarFill) this.bossHealthBarFill.destroy()
		if (this.bossHealthText) this.bossHealthText.destroy()

		// Remove Boss entity from world
		if (this.bossEid !== null) {
			despawnEntity(this.world, this.bossEid)
			this.bossEid = null
		}

		// Complete objective 1: Defeat Boss
		this.completeObjectiveById('defeat-boss')

		// Show teleport targets
		this.setTeleportTargetsVisible(true)
	}

	private createTeleportTargets() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)!
		// Create 3 teleport targets at reasonable distances from player spawn
		// Spread them out in different directions, but keep them within world bounds (960x540)
		// Player spawn is at (120, 270), so ensure all positions are within bounds
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540
		
		// Calculate positions relative to player, ensuring they stay within bounds
		// Position 1: Right and up
		// Position 2: Right and down
		// Position 3: Left and down (but not too far down to stay in bounds)
		const locs = [
			{ 
				x: Math.min(playerBody.x + 350, worldWidth - 50), 
				y: Math.max(playerBody.y - 200, 50) 
			},
			{ 
				x: Math.min(playerBody.x + 500, worldWidth - 50), 
				y: Math.min(playerBody.y + 150, worldHeight - 50) 
			},
			{ 
				x: Math.max(playerBody.x - 150, 50), 
				y: Math.min(playerBody.y + 200, worldHeight - 50) 
			},
		]

		locs.forEach((loc) => {
			const marker = this.add.circle(loc.x, loc.y, 30, 0x00ffff, 0.4).setStrokeStyle(2, 0x00ffff)
			const collector = this.physics.add.image(loc.x, loc.y, '').setVisible(false).setSize(60, 60)
			
			// Create coordinate text for each marker
			const coordText = this.add.text(loc.x, loc.y + 50, '', {
				fontSize: '12px',
				color: '#00ffff',
				stroke: '#000000',
				strokeThickness: 2,
			}).setOrigin(0.5)

			this.physics.add.overlap(
				this.world.resources.bodies.get(this.world.resources.playerEid)!,
				collector,
				() => {
					const target = this.teleportTargets.find((t) => t.collector === collector)
					if (target && !target.collected) {
						target.collected = true
						
						// Remove marker and collector
						target.marker.destroy()
						target.collector.destroy()
						if (target.coordText) {
							target.coordText.destroy()
						}

						// Update progress
						const count = this.getCollectedCount()
						this.updateObjectiveDescription('collect-markers', `Collect 3 markers (${count}/3)`)

						// Check if all collected
						if (count === 3) {
							this.completeObjectiveById('collect-markers')
							// Check if all objectives are complete to unlock next level
							this.checkLevelCompletion()
						}
					}
				}
			)

			this.teleportTargets.push({ ...loc, marker, collector, coordText, collected: false })
		})
	}

	private getCollectedCount() {
		return this.teleportTargets.filter((t) => t.collected).length
	}

	private setTeleportTargetsVisible(v: boolean) {
		this.teleportTargets.forEach((t) => {
			t.marker.setVisible(v)
			if (t.coordText) {
				t.coordText.setVisible(v)
			}
		})
	}

	private updateBossCoordinates() {
		const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
		const boss = this.world.resources.bodies.get(this.bossEid!)!
		const dx = Math.round(boss.x - player.x)
		const dy = Math.round(boss.y - player.y)
		this.bossCoordText.setText(`Boss dx: ${dx} dy: ${dy}`).setPosition(boss.x, boss.y + 60)
	}

	private updateBossHealthUI() {
		if (this.bossEid === null || this.bossDefeated) return

		const boss = this.world.resources.bodies.get(this.bossEid)
		if (!boss) return

		const currentHealth = Health.current[this.bossEid] || 0
		const maxHealth = Health.max[this.bossEid] || 100
		const healthPercent = Math.max(0, Math.min(1, currentHealth / maxHealth))

		// Update health bar position
		const barX = boss.x - 60
		const barY = boss.y - 80
		const barWidth = 120
		const barHeight = 12

		// Clear and redraw health bar background
		this.bossHealthBarBg.clear()
		this.bossHealthBarBg.fillStyle(0x000000, 0.5)
		this.bossHealthBarBg.fillRect(barX, barY, barWidth, barHeight)

		// Clear and redraw health bar fill
		this.bossHealthBarFill.clear()
		const color = healthPercent > 0.5 ? 0x00ff00 : healthPercent > 0.25 ? 0xffff00 : 0xff0000
		this.bossHealthBarFill.fillStyle(color, 1)
		this.bossHealthBarFill.fillRect(barX, barY, barWidth * healthPercent, barHeight)

		// Update health text
		this.bossHealthText.setPosition(boss.x, boss.y - 100)
		this.bossHealthText.setText(`${Math.ceil(currentHealth)} / ${maxHealth}`)
	}

	private updateTeleportTargetCoordinates() {
		const player = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!player) return

		this.teleportTargets.forEach((target) => {
			if (!target.collected && target.coordText) {
				const dx = Math.round(target.x - player.x)
				const dy = Math.round(target.y - player.y)
				target.coordText.setText(`dx: ${dx} dy: ${dy}`)
				target.coordText.setPosition(target.x, target.y + 50)
			}
		})
	}

	private updateMinimapWithTargets() {
		// Only show teleport targets on minimap after boss is defeated
		if (!this.bossDefeated) {
			// Clear any existing dots
			this.minimapMarkerDots.forEach((dot) => dot.destroy())
			this.minimapMarkerDots = []
			return
		}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody) return

		const size = 150
		
		// Calculate bounds that include player and all uncollected teleport targets
		const uncollectedTargets = this.teleportTargets.filter(t => !t.collected)
		
		// Find min/max coordinates including player position
		const allPoints = [
			{ x: playerBody.x, y: playerBody.y },
			...uncollectedTargets.map(t => ({ x: t.x, y: t.y }))
		]
		
		if (allPoints.length === 0) {
			// Clear dots if all collected
			this.minimapMarkerDots.forEach((dot) => dot.destroy())
			this.minimapMarkerDots = []
			return
		}

		let minX = Math.min(...allPoints.map(p => p.x))
		let maxX = Math.max(...allPoints.map(p => p.x))
		let minY = Math.min(...allPoints.map(p => p.y))
		let maxY = Math.max(...allPoints.map(p => p.y))

		// Add padding to ensure all points are visible with some margin
		const padding = 150
		minX -= padding
		maxX += padding
		minY -= padding
		maxY += padding

		// Calculate world dimensions for minimap
		const worldWidth = maxX - minX
		const worldHeight = maxY - minY
		const scaleX = size / worldWidth
		const scaleY = size / worldHeight

		// Clear previous marker dots
		this.minimapMarkerDots.forEach((dot) => dot.destroy())
		this.minimapMarkerDots = []

		// Add dots for uncollected teleport targets
		const minimapContainer = (this as any).minimapContainer
		if (minimapContainer) {
			uncollectedTargets.forEach((target) => {
				// Convert world coordinates to minimap coordinates
				const minimapX = (target.x - minX) * scaleX
				const minimapY = (target.y - minY) * scaleY
				
				// Ensure coordinates are within minimap bounds
				if (minimapX >= 0 && minimapX <= size && minimapY >= 0 && minimapY <= size) {
					const dot = this.add.circle(
						minimapX,
						minimapY,
						4,
						0x00ffff,
						0.9
					)
					dot.setScrollFactor(0).setDepth(1001)
					minimapContainer.add(dot)
					this.minimapMarkerDots.push(dot)
				}
			})
		}
	}

	private checkLevelCompletion() {
		// Check if all objectives are completed
		const allObjectives = (this as any).allObjectives
		if (allObjectives && allObjectives.every((obj: any) => obj.completed)) {
			// Call parent method to complete level and unlock next
			this.onAllObjectivesComplete()
		}
	}
}
