import { Health } from '../components'
import type { GameWorld } from '../gameWorld'

export function hudSystem(world: GameWorld) {
	const playerEid = world.resources.playerEid
	const hp = Health.current[playerEid] || 0
	const max = Health.max[playerEid] || 0
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



