import Phaser from 'phaser'
import { GameEvents } from '../events'
import { preloadPixelBackground, initPixelBackground } from '../ui/pixelBackground'

/**
 * Main menu — pixel art background scene.
 */
export class MainInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'MainInterface' })
	}

	preload() {
		preloadPixelBackground(this)
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		initPixelBackground(this)
		this.game.events.emit(GameEvents.uiMainMenu, { visible: true })

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.emit(GameEvents.uiMainMenu, { visible: false })
		})
	}
}
