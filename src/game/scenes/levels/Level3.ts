import { BaseScene } from '../base/BaseScene'
import { MinionSpawner } from '../../MinionSpawner'
import { getCombatConfig } from '../../configs/CombatConfig'

export class Level3 extends BaseScene {
    private minionSpawner?: MinionSpawner
    private killCount: number = 0

    constructor() { super({ key: 'Level3' }) }

    protected onLevelCreate(): void {
        const difficulty = getCombatConfig(1, 1)
        this.setTaskInfo("清缴任务", ["消灭所有区域内的逻辑错误", `当前击杀: 0`])

        // 1. 小兵生成
        this.minionSpawner = new MinionSpawner(this, difficulty!)
        this.minionSpawner.startSpawning()

        // 2. 监听事件
        this.events.on('minion-killed', () => {
            this.killCount++
            this.setTaskInfo("清缴任务", [`当前击杀: ${this.killCount}`])
            if (!this.minionSpawner?.hasMinions()) {
                this.showInstruction("区域已清空，传送门已激活。")
            }
        })

        // 3. 玩家攻击键
        this.input.keyboard!.on('keydown-SPACE', () => this.playerAttack())
    }

    private playerAttack() {
        const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
        // 范围攻击特效
        const circle = this.add.circle(player.x, player.y, 100, 0x00ff00, 0.2)
        this.tweens.add({ targets: circle, alpha: 0, scale: 1.5, duration: 200, onComplete: () => circle.destroy() })

        // 伤害逻辑：通过 Spawner 获取活跃小兵
        this.minionSpawner?.getMinions().forEach(m => {
            if (Phaser.Math.Distance.Between(player.x, player.y, m.x, m.y) < 100) {
                m.takeDamage(50)
            }
        })
    }

    protected onLevelUpdate(): void {
        if (this.minionSpawner) this.minionSpawner.update(this.game.loop.delta)
    }
}