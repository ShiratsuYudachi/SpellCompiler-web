import Phaser from 'phaser'

export class DebugScene extends Phaser.Scene {
	constructor() {
		super('DebugScene')
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
		// Background
		this.add.tileSprite(0, 0, 960, 540, 'bg').setOrigin(0, 0).setDepth(-100)

		const baseConfigs = [
			{ key: 'player', label: 'Player' },
			{ key: 'friendly1', label: 'Friendly 1' },
			{ key: 'friendly2', label: 'Friendly 2' },
			{ key: 'neutral1', label: 'Neutral 1' },
			{ key: 'enemy1', label: 'Enemy 1' },
			{ key: 'enemy2', label: 'Enemy 2' },
			{ key: 'enemy3', label: 'Enemy 3' },
		]

		const startX = 150
		let currentX = startX
		const y = 270

		this.add.text(480, 100, 'All Texture Assets View', { color: '#ffffff', fontSize: '24px', fontStyle: 'bold' }).setOrigin(0.5)

		baseConfigs.forEach((cfg) => {
			const size = cfg.key === 'player' ? 112 : 70
			this.add.image(currentX, y, cfg.key).setDisplaySize(size, size)
			const labelOffset = cfg.key === 'player' ? 80 : 60
			this.add.text(currentX, y + labelOffset, cfg.label, { color: '#ffffff', fontSize: '14px' }).setOrigin(0.5)
			currentX += 110
		})
	}

	update() {
		// nothing
	}
}
