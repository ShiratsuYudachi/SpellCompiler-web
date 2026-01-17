/**
 * Level 8
 *
 * This level is under development.
 */

import { BaseScene } from '../base/BaseScene'

export class Level8 extends BaseScene {
	constructor() {
		super({ key: 'Level8' })
	}

	protected onLevelCreate(): void {
		this.showInstruction(
			'【Level 8】\n\n' +
			'This level is under development.\n\n' +
			'Please check back later for updates!'
		)

		// Camera settings
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}
	}
}
