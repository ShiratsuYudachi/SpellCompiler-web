import type Phaser from 'phaser'
import type { Entity } from '../core/Entity'
import { Entity as GameEntity } from '../core/Entity'
import { SpriteComponent } from '../components/SpriteComponent'
import { FireballComponent } from '../components/FireballComponent'

function ensureFireballTexture(scene: Phaser.Scene) {
	const key = 'fireball'
	if (scene.textures.exists(key)) {
		return key
	}

	const g = scene.add.graphics()
	g.fillStyle(0xffaa33, 1)
	g.fillCircle(6, 6, 6)
	g.generateTexture(key, 12, 12)
	g.destroy()
	return key
}

export function spawnFireball(
	scene: Phaser.Scene & { getEntities(): Entity[] },
	owner: Entity,
	x: number,
	y: number,
	dirX: number,
	dirY: number,
) {
	const key = ensureFireballTexture(scene)
	const body = scene.physics.add.image(x, y, key)
	body.setDepth(20)

	const sprite = new SpriteComponent(scene, body)

	const fireball = new GameEntity()
	fireball
		.add(sprite)
		.add(new FireballComponent(scene, fireball, owner, sprite, dirX, dirY, 420, 10, 16, 1500))

	scene.getEntities().push(fireball)
	return fireball
}


