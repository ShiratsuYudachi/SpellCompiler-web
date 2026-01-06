import type Phaser from 'phaser'
import type { CompiledSpell } from './spells/types'

export type InputState = {
	cursors: Phaser.Types.Input.Keyboard.CursorKeys
	keys: Record<string, Phaser.Input.Keyboard.Key>
	meleeKey: Phaser.Input.Keyboard.Key
	spellKey1: Phaser.Input.Keyboard.Key
}

export type GameResources = {
	scene: Phaser.Scene
	bodies: Map<number, Phaser.Physics.Arcade.Image>
	playerEid: number
	hudText: Phaser.GameObjects.Text
	spellByEid: Map<number, CompiledSpell>
	spellMessageByEid: Map<number, string>
	input: InputState
	score?: number // Optional score for scenes that use it
}

