import type { GameWorld } from '../gameWorld'

export function hudSystem(world: GameWorld) {
	const playerEid = world.resources.playerEid
	const spellMessage = world.resources.spellMessageByEid.get(playerEid) || ''

	world.resources.hudText.setText(
		[
			``,
			'',
			'',
			'',
			spellMessage,
		].join('\n'),
	)
}



