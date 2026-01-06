/**
 * Level 2 - Boss战斗关卡
 * 不使用BaseScene的ECS系统，独立的战斗系统
 */

import Phaser from 'phaser'
import { Boss } from '../../boss/entities/Boss'
import { defaultBossConfig } from '../../boss/configs/BossConfig'

export class Level2 extends Phaser.Scene {
	private boss!: Boss
	private combatPlayer!: Phaser.GameObjects.Rectangle & {
		health: number
		maxHealth: number
		takeDamage: (amount: number) => void
	}
	private wasd!: {
		W: Phaser.Input.Keyboard.Key
		A: Phaser.Input.Keyboard.Key
		S: Phaser.Input.Keyboard.Key
		D: Phaser.Input.Keyboard.Key
	}
	private spaceKey!: Phaser.Input.Keyboard.Key
	private bullets: Phaser.GameObjects.Rectangle[] = []
	private playerHealthText!: Phaser.GameObjects.Text
	private instructionsText!: Phaser.GameObjects.Text

	constructor() {
		super({ key: 'Level2' })
	}

	create(): void {
		this.cameras.main.setBackgroundColor('#1a1a2e')
		this.createCombatPlayer()
		this.createBoss()
		this.createBossUI()
		this.setupBossControls()
		this.setupBossEventListeners()
	}

	update(): void {
		if (this.combatPlayer && this.wasd) {
			const speed = 200
			let vx = 0
			let vy = 0

			if (this.wasd.W.isDown) vy -= 1
			if (this.wasd.S.isDown) vy += 1
			if (this.wasd.A.isDown) vx -= 1
			if (this.wasd.D.isDown) vx += 1

			if (vx !== 0 || vy !== 0) {
				const len = Math.sqrt(vx * vx + vy * vy)
				vx = (vx / len) * speed * (this.game.loop.delta / 1000)
				vy = (vy / len) * speed * (this.game.loop.delta / 1000)
			}

			this.combatPlayer.x += vx
			this.combatPlayer.y += vy
			this.combatPlayer.x = Phaser.Math.Clamp(this.combatPlayer.x, 20, 940)
			this.combatPlayer.y = Phaser.Math.Clamp(this.combatPlayer.y, 20, 520)
		}

		for (let i = this.bullets.length - 1; i >= 0; i--) {
			const bullet = this.bullets[i]
			if (!bullet || !bullet.active) {
				this.bullets.splice(i, 1)
				continue
			}

			const visualBoss = this.boss.getVisualBoss()
			if (visualBoss) {
				const container = visualBoss.getContainer()
				const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, container.x, container.y)
				if (distance < 50) {
					this.boss.takeDamage(10)
					bullet.destroy()
					this.bullets.splice(i, 1)
				}
			}

			if (bullet.x < 0 || bullet.x > 960 || bullet.y < 0 || bullet.y > 540) {
				bullet.destroy()
				this.bullets.splice(i, 1)
			}
		}
	}

	private createCombatPlayer(): void {
		const player = this.add.rectangle(480, 450, 40, 40, 0x00aaff) as any
		player.setStrokeStyle(2, 0xffffff)
		player.setName('combat-player')
		player.health = 200
		player.maxHealth = 200

		player.takeDamage = (amount: number) => {
			player.health = Math.max(0, player.health - amount)
			this.updatePlayerHealthUI()
			player.setFillStyle(0xff0000)
			this.time.delayedCall(100, () => {
				if (player.health > 0) player.setFillStyle(0x00aaff)
			})
			if (player.health === 0) this.onPlayerDeath()
		}

		this.combatPlayer = player
	}

	private createBoss(): void {
		this.boss = new Boss(this, 480, 200, defaultBossConfig)
		const visualBoss = this.boss.getVisualBoss()
		if (visualBoss) {
			visualBoss.getContainer().setName('boss-container')
		}
	}

	private createBossUI(): void {
		this.playerHealthText = this.add.text(20, 20, '', { fontSize: '20px', color: '#00ff00' }).setScrollFactor(0)
		this.instructionsText = this.add
			.text(480, 500, 'WASD: Move | SPACE: Shoot', { fontSize: '16px', color: '#ffffff' })
			.setOrigin(0.5)
			.setScrollFactor(0)
		this.updatePlayerHealthUI()
	}

	private setupBossControls(): void {
		this.wasd = {
			W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
			A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
		}
		this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
		this.spaceKey.on('down', () => this.shootBullet())
	}

	private shootBullet(): void {
		if (!this.combatPlayer) return
		const bullet = this.add.rectangle(this.combatPlayer.x, this.combatPlayer.y - 30, 8, 20, 0xffff00)
		this.tweens.add({
			targets: bullet,
			y: bullet.y - 600,
			duration: 1000,
			onComplete: () => bullet.destroy(),
		})
		this.bullets.push(bullet)
	}

	private setupBossEventListeners(): void {
		this.boss.on('defeated', () => this.onBossDefeated())
		this.boss.on('attackHit', (damage: number) => {
			if (this.combatPlayer) this.combatPlayer.takeDamage(damage)
		})
	}

	private onBossDefeated(): void {
		this.add
			.text(480, 270, 'VICTORY!', { fontSize: '64px', color: '#00ff00', fontStyle: 'bold' })
			.setOrigin(0.5)
			.setScrollFactor(0)
		this.time.delayedCall(2000, () => this.scene.start('LevelSelectScene'))
	}

	private onPlayerDeath(): void {
		this.add
			.text(480, 270, 'GAME OVER', { fontSize: '64px', color: '#ff0000', fontStyle: 'bold' })
			.setOrigin(0.5)
			.setScrollFactor(0)
		if (this.combatPlayer) this.combatPlayer.setFillStyle(0x666666)
		this.time.delayedCall(2000, () => this.scene.restart())
	}

	private updatePlayerHealthUI(): void {
		if (this.playerHealthText && this.combatPlayer) {
			this.playerHealthText.setText(`HP: ${this.combatPlayer.health}/${this.combatPlayer.maxHealth}`)
			if (this.combatPlayer.health < 50) this.playerHealthText.setColor('#ff0000')
			else if (this.combatPlayer.health < 100) this.playerHealthText.setColor('#ffaa00')
			else this.playerHealthText.setColor('#00ff00')
		}
	}
}
