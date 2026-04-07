import Phaser from 'phaser'
import { GameEvents } from '../events'
import { preloadPixelBackground, initPixelBackground } from '../ui/pixelBackground'

/**
 * Level grid is React (LevelSelectOverlay). Phaser draws background only.
 */
export class LevelSelectInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'LevelSelectInterface' })
	}

	preload() {
		preloadPixelBackground(this)
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		initPixelBackground(this)
		this.game.events.emit(GameEvents.uiLevelSelect, { visible: true })
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.emit(GameEvents.uiLevelSelect, { visible: false })
		})
	}
}
