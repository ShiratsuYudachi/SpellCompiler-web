import Phaser from 'phaser'

/**
 * Reusable Laser Wall prefab
 * Creates a deadly laser wall with animated particles
 */
export class LaserWall {
	private scene: Phaser.Scene
	private wall: Phaser.GameObjects.Rectangle
	private particles: Phaser.GameObjects.Rectangle[] = []
	private x: number
	private y: number
	private width: number
	private height: number

	constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
		this.scene = scene
		this.x = x
		this.y = y
		this.width = width
		this.height = height

		// Create main laser wall
		this.wall = scene.add.rectangle(x, y, width, height, 0xff0000, 0.3)
		this.wall.setStrokeStyle(2, 0xff0000, 1)

		// Add animated particles for visual effect
		this.createParticles()
	}

	private createParticles() {
		const particleCount = 15
		for (let i = 0; i < particleCount; i++) {
			const particle = this.scene.add.rectangle(
				this.x,
				(i / particleCount) * this.height,
				this.width - 2,
				8,
				0xff0000,
				0.8
			)
			this.particles.push(particle)

			// Animate particles moving up and down
			this.scene.tweens.add({
				targets: particle,
				y: particle.y + this.height / particleCount,
				duration: 1000 + Math.random() * 500,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			})

			// Pulse alpha
			this.scene.tweens.add({
				targets: particle,
				alpha: 0.3,
				duration: 500 + Math.random() * 300,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			})
		}
	}

	/**
	 * Check if a point (e.g., player position) is inside the laser wall
	 */
	public contains(x: number, y: number): boolean {
		const bounds = this.wall.getBounds()
		return x > bounds.left && x < bounds.right && y > bounds.top && y < bounds.bottom
	}

	/**
	 * Get the laser wall bounds
	 */
	public getBounds(): Phaser.Geom.Rectangle {
		return this.wall.getBounds()
	}

	/**
	 * Destroy the laser wall and all its particles
	 */
	public destroy() {
		this.wall.destroy()
		this.particles.forEach(p => p.destroy())
		this.particles = []
	}

	/**
	 * Set visibility of the laser wall
	 */
	public setVisible(visible: boolean) {
		this.wall.setVisible(visible)
		this.particles.forEach(p => p.setVisible(visible))
	}
}
