import { BaseScene } from '../base/BaseScene'
import { Boss } from '../../boss/entities/Boss'
import { defaultBossConfig } from '../../boss/configs/BossConfig'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level2Meta: LevelMeta = {
	key: 'Level2',
	playerSpawnX: 480,
	playerSpawnY: 400,
}

levelRegistry.register(Level2Meta)

export class Level2 extends BaseScene {
    private boss!: Boss
    private bullets: Phaser.GameObjects.Rectangle[] = []

    constructor() { super({ key: 'Level2' }) }

    protected onLevelCreate(): void {
        this.setTaskInfo("Emergency Battle", ["Survive and defeat the Core Guardian", "Controls: WASD to move", "Controls: Left Click to shoot (aims at mouse)"])

        // Initialize special Boss entity
        this.boss = new Boss(this, 480, 200, defaultBossConfig)

        this.boss.on('defeated', () => {
            this.showInstruction("Guardian has been shut down.")
            this.time.delayedCall(2000, () => this.scene.start('LevelSelectScene'))
        })

        this.boss.on('attackHit', (_dmg: number) => {
            // Can integrate with base class Mana or Health system
            this.cameras.main.shake(100, 0.01)
        })

        // 鼠标左键射击
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.shoot(pointer.x, pointer.y)
            }
        })
    }

    protected onLevelUpdate(): void {
        // This level allows physical movement
        const playerEid = this.world.resources.playerEid
        const playerBody = this.world.resources.bodies.get(playerEid)
        if (playerBody) {
            const speed = 300
            playerBody.setVelocity(0)
            if (this.input.keyboard!.addKey('A').isDown) playerBody.setVelocityX(-speed)
            if (this.input.keyboard!.addKey('D').isDown) playerBody.setVelocityX(speed)
            if (this.input.keyboard!.addKey('W').isDown) playerBody.setVelocityY(-speed)
            if (this.input.keyboard!.addKey('S').isDown) playerBody.setVelocityY(speed)

            // 更新Boss AI
            this.boss.update(this.game.loop.delta, playerBody.x, playerBody.y)
        }

        // Bullet collision detection
        const visualBoss = this.boss.getVisualBoss()
        if (visualBoss) {
            const container = visualBoss.getContainer()
            // Iterate in reverse to avoid index issues when removing
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                const b = this.bullets[i]
                const distance = Phaser.Math.Distance.Between(b.x, b.y, container.x, container.y)
                // Increased collision radius from 50 to 80 to account for Boss size
                if (distance < 80) {
                    this.boss.takeDamage(10)
                    b.destroy()
                    this.bullets.splice(i, 1)
                }
            }
        }
    }

    private shoot(targetX: number, targetY: number) {
        const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
        const bullet = this.add.rectangle(player.x, player.y, 8, 8, 0xffff00) as Phaser.GameObjects.Rectangle
        this.physics.add.existing(bullet)
        const body = bullet.body as Phaser.Physics.Arcade.Body

        // 计算朝向鼠标的方向
        const dx = targetX - player.x
        const dy = targetY - player.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 600

        if (distance > 0) {
            body.setVelocity(
                (dx / distance) * speed,
                (dy / distance) * speed
            )
        } else {
            body.setVelocityY(-speed)
        }

        this.bullets.push(bullet)
    }
}
