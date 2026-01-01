import { Health } from '../components'
import type { GameWorld } from '../gameWorld'

export function hudSystem(world: GameWorld) {
	const playerEid = world.resources.playerEid
	const hp = Health.current[playerEid] || 0
	const max = Health.max[playerEid] || 0

	const spellMessage = world.resources.spellMessageByEid.get(playerEid) || ''

	world.resources.hudText.setText(
		[
			`HP: ${hp}/${max}`,
			'WASD / Arrows to move',
			'Space to melee (1s CD)',
			'Left click to fireball (0.3s CD)',
			'1 to cast loaded spell',
			'Tab to toggle Editor',
			spellMessage,
		].join('\n'),
	)
}



