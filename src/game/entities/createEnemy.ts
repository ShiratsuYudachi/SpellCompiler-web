import Phaser from 'phaser'
import { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'
import { createRectBody } from './createRectBody'

export function createEnemy(scene: Phaser.Scene, x = 740, y = 270) {
	const body = createRectBody(scene, 'enemy-rect', 0xff4444, 28, 28, x, y, 4)
	body.setCollideWorldBounds(true)

	const sprite = new SpriteComponent(scene, body)

	const enemy = new Entity()
	enemy
		.add(sprite)
		.add(new HealthComponent(50, () => sprite.flash()))
	return enemy
}



