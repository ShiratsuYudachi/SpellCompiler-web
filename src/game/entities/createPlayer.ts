import Phaser from 'phaser'
import { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'
import { PlayerControlComponent } from '../components/PlayerControlComponent'
import { PlayerSpellManagerComponent } from '../components/PlayerSpellManagerComponent'
import { createRectBody } from './createRectBody'
import { SpellCasterComponent } from '../components/SpellCasterComponent'

export function createPlayer(scene: Phaser.Scene & { getEntities(): Entity[] }, x = 200, y = 270) {
	const body = createRectBody(scene, 'player-rect', 0x4a90e2, 32, 32, x, y, 5)
	body.setCollideWorldBounds(true)

	const sprite = new SpriteComponent(scene, body)

	const player = new Entity()
	player
		.add(sprite)
		.add(new HealthComponent(100, () => sprite.flash()))
		.add(new SpellCasterComponent(player))
		.add(new PlayerSpellManagerComponent(player))
		.add(new PlayerControlComponent(scene, player, sprite))
	return player
}



