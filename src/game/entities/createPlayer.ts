import Phaser from 'phaser'
import type { InputSystem } from '../core/InputSystem'
import { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'
import { PlayerMoveComponent } from '../components/PlayerMoveComponent'
import { createRectBody } from './createRectBody'

export function createPlayer(scene: Phaser.Scene, input: InputSystem, x = 200, y = 270) {
	const body = createRectBody(scene, 'player-rect', 0x4a90e2, 32, 32, x, y, 5)
	body.setCollideWorldBounds(true)

	const sprite = new SpriteComponent(scene, body)

	return new Entity()
		.add(sprite)
		.add(new HealthComponent(100, () => sprite.flash()))
		.add(new PlayerMoveComponent(input, sprite, 220))
}



