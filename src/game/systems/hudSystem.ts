import type { GameWorld } from '../gameWorld'
import { patchLevelHud } from '../ui/gameDomUiStore'

export function hudSystem(world: GameWorld) {
	const playerEid = world.resources.playerEid
	const sceneKey = world.resources.scene.scene.key

	let shouldHideSpellMessage = false

	if (sceneKey === 'Level8') {
		shouldHideSpellMessage = true
	}

	if (sceneKey === 'Level7') {
		const levelData = world.resources.levelData
		if (levelData && levelData.currentTask === 'task2') {
			shouldHideSpellMessage = true
		}
	}

	if (shouldHideSpellMessage) {
		world.resources.spellMessageByEid.set(playerEid, '')
		patchLevelHud({ spellLine: '' })
		return
	}

	const spellMessage = world.resources.spellMessageByEid.get(playerEid) || ''
	patchLevelHud({ spellLine: spellMessage })
}
