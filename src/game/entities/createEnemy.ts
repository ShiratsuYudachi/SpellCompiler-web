import Phaser from 'phaser'
import { Entity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { HealthComponent } from '../components/HealthComponent'
import { EnemyChaseComponent } from '../components/EnemyChaseComponent'
import { ContactDamageComponent } from '../components/ContactDamageComponent'
import { createRectBody } from './createRectBody'

export function createEnemy(scene: Phaser.Scene, player: Entity, x = 740, y = 270) {
	const body = createRectBody(scene, 'enemy-rect', 0xff4444, 28, 28, x, y, 4)
	body.setCollideWorldBounds(true)

	const enemy = new Entity()
	const enemySprite = new SpriteComponent(scene, body)
	const playerSprite = player.get(SpriteComponent)!

	enemy
		.add(enemySprite)
		.add(new HealthComponent(50))
		.add(new EnemyChaseComponent(enemySprite, playerSprite, 140))
		.add(new ContactDamageComponent(enemy, player, 40, 5, 250))

	return enemy
}



