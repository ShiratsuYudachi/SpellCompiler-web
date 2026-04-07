import Phaser from 'phaser'

export function initPixelBackground(scene: Phaser.Scene) {
	const { width, height } = scene.scale

	// 1. Background image
	scene.add.tileSprite(0, 0, width, height, 'bg').setOrigin(0, 0).setDepth(-100)

	// 2. Physics & Wandering Entities
	if (scene.physics) {
		scene.physics.world.setBounds(0, 0, width, height)

		const entityTypes = [
			{ key: 'player', size: 112 },
			{ key: 'friendly1', size: 70 },
			{ key: 'friendly2', size: 70 },
			{ key: 'neutral1', size: 70 },
			{ key: 'enemy1', size: 70 },
			{ key: 'enemy2', size: 70 },
			{ key: 'enemy3', size: 70 },
		]

		const bouncers: Phaser.Physics.Arcade.Image[] = []
		entityTypes.forEach(({ key, size }) => {
			const b = scene.physics.add.image(
				Phaser.Math.Between(100, width - 100),
				Phaser.Math.Between(100, height - 100),
				key
			)
			b.setDisplaySize(size, size)
			b.setCollideWorldBounds(true)
			b.setBounce(1, 1)
			
			let vx = Phaser.Math.Between(40, 90)
			let vy = Phaser.Math.Between(40, 90)
			if (Math.random() > 0.5) vx *= -1
			if (Math.random() > 0.5) vy *= -1
			b.setVelocity(vx, vy)
			
			b.setAngularVelocity(Phaser.Math.Between(-15, 15))
			bouncers.push(b)
		})

		// 3. Pixel Particles
		const pColors = [0x4a90e2, 0xff4444, 0x48bb78, 0xffdd44]
		const particles = scene.add.particles(0, 0, 'friendly1', {
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
		scene.time.addEvent({
			delay: 2500,
			loop: true,
			callback: () => {
				const shooterBase = Phaser.Math.RND.pick(
					bouncers.filter(b => b.texture.key.startsWith('enemy'))
				)
				if (!shooterBase) return

				// Decorative bullets: simple colored circles instead of NPC textures
				const bullet = scene.add.circle(shooterBase.x, shooterBase.y, 6, 0xffffff) as any
				scene.physics.add.existing(bullet)
				
				const target = Phaser.Math.RND.pick(bouncers.filter(b => b !== shooterBase))
				if (target && Math.random() > 0.3) {
					scene.physics.moveToObject(bullet, target, 250)
				} else {
					bullet.setVelocity(Phaser.Math.Between(-250, 250), Phaser.Math.Between(-250, 250))
				}
				
				scene.time.delayedCall(3000, () => {
					if (bullet.active) bullet.destroy()
				})
			}
		})
	}
}

export function preloadPixelBackground(scene: Phaser.Scene) {
	const base = import.meta.env.BASE_URL || '/'
	scene.load.image('enemy1', base + 'assets/enemy1.png')
	scene.load.image('enemy2', base + 'assets/enemy2.png')
	scene.load.image('enemy3', base + 'assets/enemy3.png')
	scene.load.image('friendly1', base + 'assets/friendly1.png')
	scene.load.image('friendly2', base + 'assets/friendly2.png')
	scene.load.image('neutral1', base + 'assets/neutral1.png')
	scene.load.image('player', base + 'assets/player.png')
	scene.load.image('bg', base + 'assets/bg.png')
}
