import type { GameWorld } from '../gameWorld'

export function hudSystem(world: GameWorld) {
	const playerEid = world.resources.playerEid
	const sceneKey = world.resources.scene.scene.key
	
	// Check if we should hide spell message
	let shouldHideSpellMessage = false
	
	// Level 8: Always hide spell message
	if (sceneKey === 'Level8') {
		shouldHideSpellMessage = true
	}
	
	// Level 7: Hide spell message only in Task 2
	if (sceneKey === 'Level7') {
		const levelData = world.resources.levelData
		// Check if currentTask is 'task2' (Level7 stores this in levelData or we can check scene instance)
		// Since we can't easily access scene instance here, we'll check levelData
		// Level7 should set a flag in levelData when Task 2 starts
		if (levelData && levelData.currentTask === 'task2') {
			shouldHideSpellMessage = true
		}
	}
	
	// If we should hide, clear the message and don't display it
	if (shouldHideSpellMessage) {
		world.resources.spellMessageByEid.set(playerEid, '')
		world.resources.hudText.setText(
			[
				``,
				'',
				'',
				'',
				'',
			].join('\n'),
		)
		return
	}
	
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



