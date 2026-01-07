import { BaseScene } from '../base/BaseScene'
import { Boss } from '../../boss/entities/Boss'
import { defaultBossConfig } from '../../boss/configs/BossConfig'

export class Level2 extends BaseScene {
    private boss!: Boss
    private bullets: Phaser.GameObjects.Rectangle[] = []
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

    constructor() { super({ key: 'Level2' }) }

    protected onLevelCreate(): void {
        this.setTaskInfo("Emergency Battle", ["Survive and defeat the Core Guardian", "Controls: WASD to move", "Controls: SPACE to shoot"])
        
        // Initialize special Boss entity
        this.boss = new Boss(this, 480, 200, defaultBossConfig)
        
        this.boss.on('defeated', () => {
            this.showInstruction("Guardian has been shut down.")
            this.time.delayedCall(2000, () => this.scene.start('LevelSelectScene'))
        })

        this.boss.on('attackHit', (dmg: number) => {
            // Can integrate with base class Mana or Health system
            this.cameras.main.shake(100, 0.01)
        })

        this.cursors = this.input.keyboard!.createCursorKeys()
        this.input.keyboard!.on('keydown-SPACE', () => this.shoot())
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
        }

        // Bullet collision detection
        const visualBoss = this.boss.getVisualBoss()
        if (visualBoss) {
            const container = visualBoss.getContainer()
            this.bullets.forEach((b, i) => {
                if (Phaser.Math.Distance.Between(b.x, b.y, container.x, container.y) < 50) {
                    this.boss.takeDamage(10)
                    b.destroy()
                    this.bullets.splice(i, 1)
                }
            })
        }
    }

    private shoot() {
        const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
        const b = this.add.rectangle(player.x, player.y - 30, 8, 20, 0xffff00)
        this.physics.add.existing(b)
        (b.body as Phaser.Physics.Arcade.Body).setVelocityY(-600)
        this.bullets.push(b)
    }
}