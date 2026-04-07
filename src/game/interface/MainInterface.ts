import Phaser from 'phaser'
import { GameEvents } from '../events'

/**
 * Main menu — pixel art background scene.
 */
export class MainInterface extends Phaser.Scene {
	private bouncers: Phaser.Physics.Arcade.Image[] = []

	constructor() {
		super({ key: 'MainInterface' })
	}

	preload() {
		const base = import.meta.env.BASE_URL || '/'
		this.load.image('enemy1', base + 'assets/enemy1.png')
		this.load.image('enemy2', base + 'assets/enemy2.png')
		this.load.image('enemy3', base + 'assets/enemy3.png')
		this.load.image('friendly1', base + 'assets/friendly1.png')
		this.load.image('friendly2', base + 'assets/friendly2.png')
		this.load.image('neutral1', base + 'assets/neutral1.png')
		this.load.image('player', base + 'assets/player.png')
		this.load.image('bg', base + 'assets/bg.png')
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		
		const { width, height } = this.scale

		// 1. Background image
		this.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0).setDepth(-100)

		// 2. Physics & Wandering Entities
		this.physics.world.setBounds(0, 0, width, height)

		const entityTypes = [
			{ key: 'player', size: 112 },
			{ key: 'friendly1', size: 70 },
			{ key: 'friendly2', size: 70 },
			{ key: 'neutral1', size: 70 },
			{ key: 'enemy1', size: 70 },
			{ key: 'enemy2', size: 70 },
			{ key: 'enemy3', size: 70 },
		]

		this.bouncers = []
		entityTypes.forEach(({ key, size }) => {
			const b = this.physics.add.image(
				Phaser.Math.Between(100, width - 100),
				Phaser.Math.Between(100, height - 100),
				key
			)
			b.setDisplaySize(size, size)
			b.setCollideWorldBounds(true)
			b.setBounce(1, 1)
			
			// ensure they start moving at a noticeable speed
			let vx = Phaser.Math.Between(40, 90)
			let vy = Phaser.Math.Between(40, 90)
			if (Math.random() > 0.5) vx *= -1
			if (Math.random() > 0.5) vy *= -1
			b.setVelocity(vx, vy)
			
			b.setAngularVelocity(Phaser.Math.Between(-15, 15))
			this.bouncers.push(b)
		})

		// 3. Pixel Particles
		const pColors = [0x4a90e2, 0xff4444, 0x48bb78, 0xffdd44]
		const particles = this.add.particles(0, 0, 'friendly1', {
			x: { min: 0, max: width },
			y: { min: 0, max: height },
			speed: { min: 5, max: 25 },
			angle: { min: 0, max: 360 },
			scale: { start: 0.05, end: 0 },
			lifespan: 5000,
			blendMode: 'ADD',
			frequency: 180,
			tint: pColors,
			alpha: { start: 0.5, end: 0 }
		})
		particles.setDepth(-10)

		// 4. Occasional Bullet Firing
		this.time.addEvent({
			delay: 2500,
			loop: true,
			callback: () => {
				const shooterBase = Phaser.Math.RND.pick(
					this.bouncers.filter(b => b.texture.key.startsWith('enemy'))
				)
				if (!shooterBase) return

				const bulletKey = Phaser.Math.RND.pick(['enemy1', 'enemy2', 'enemy3'])
				const bullet = this.physics.add.image(shooterBase.x, shooterBase.y, bulletKey)
				bullet.setDisplaySize(30, 30) // smaller bullets
				
				// Pick a random direction or target
				const target = Phaser.Math.RND.pick(this.bouncers.filter(b => b !== shooterBase))
				if (target && Math.random() > 0.3) {
					this.physics.moveToObject(bullet, target, 250)
				} else {
					bullet.setVelocity(Phaser.Math.Between(-250, 250), Phaser.Math.Between(-250, 250))
				}
				
				// Destroy bullet after 3 seconds so they don't pile up
				this.time.delayedCall(3000, () => {
					if (bullet.active) bullet.destroy()
				})
			}
		})

		this.game.events.emit(GameEvents.uiMainMenu, { visible: true })

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.emit(GameEvents.uiMainMenu, { visible: false })
		})
	}
}
