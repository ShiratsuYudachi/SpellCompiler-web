import Phaser from 'phaser'
import { GameEvents } from '../events'
import { drawArcaneMenuBackground } from '../ui/menuVisuals'

/**
 * Save UI is React (SaveSelectOverlay). Phaser draws background only.
 */
export class SaveSelectScene extends Phaser.Scene {
	constructor() {
		super({ key: 'SaveSelectScene' })
	}

	create() {
		this.cameras.main.setBackgroundColor('#0a0e14')
		drawArcaneMenuBackground(this)
		this.game.events.emit(GameEvents.uiSaveSelect, { visible: true })
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
			this.game.events.emit(GameEvents.uiSaveSelect, { visible: false })
		})
	}
}
