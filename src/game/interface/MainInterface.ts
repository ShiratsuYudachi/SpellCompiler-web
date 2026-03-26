import Phaser from 'phaser'
import { GameEvents } from '../events'
import { drawArcaneMenuBackground } from '../ui/menuVisuals'

/**
 * Main menu — background only; labels/buttons are React DOM (MainMenuOverlay) for Pause-like sharp text.
 */
export class MainInterface extends Phaser.Scene {
	constructor() {
		super({ key: 'MainInterface' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		drawArcaneMenuBackground(this)
		this.game.events.emit(GameEvents.uiMainMenu, { visible: true })

		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.emit(GameEvents.uiMainMenu, { visible: false })
		})
	}
}
