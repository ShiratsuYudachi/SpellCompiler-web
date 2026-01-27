import { BaseScene } from '../base/BaseScene'
import { MinionSpawner } from '../../MinionSpawner'
import { getCombatConfig } from '../../configs/CombatConfig'
import { createRoom } from '../../utils/levelUtils'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

export const Level17Meta: LevelMeta = {
	key: 'Level17',
	playerSpawnX: 480,
	playerSpawnY: 270,
	tileSize: 80,
	mapData: createRoom(12, 8),
	initialSpellWorkflow: {
		nodes: [
			{ id: 'output-1', type: 'output', position: { x: 400, y: 200 }, data: { label: 'Output' } },
		],
		edges: [],
	},
}

levelRegistry.register(Level17Meta)

export class Level17 extends BaseScene {
    private minionSpawner?: MinionSpawner
    private killCount: number = 0
    
    constructor() { super({ key: 'Level17' }) }

    protected onLevelCreate(): void {
        const difficulty = getCombatConfig(1, 1)
        this.setTaskInfo("Elimination Mission", ["Eliminate all logic errors in the area", `Current kills: 0`])

        // 1. Minion spawning
        this.minionSpawner = new MinionSpawner(this, difficulty!)
        this.minionSpawner.startSpawning()

        // 2. Listen to events
        this.events.on('minion-killed', () => {
            this.killCount++
            this.setTaskInfo("Elimination Mission", [`Current kills: ${this.killCount}`])
            if (!this.minionSpawner?.hasMinions()) {
                this.showInstruction("Area cleared. Teleporter activated.")
            }
        })

        // 3. Player attack key
        this.input.keyboard!.on('keydown-SPACE', () => this.playerAttack())
    }

    private playerAttack() {
        const player = this.world.resources.bodies.get(this.world.resources.playerEid)!
        // Area attack effect
        const circle = this.add.circle(player.x, player.y, 100, 0x00ff00, 0.2)
        this.tweens.add({ targets: circle, alpha: 0, scale: 1.5, duration: 200, onComplete: () => circle.destroy() })

        // Damage logic: get active minions through Spawner
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
