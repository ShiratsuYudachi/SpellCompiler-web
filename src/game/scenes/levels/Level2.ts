import { BaseScene } from '../base/BaseScene'
import { Boss } from '../../boss/entities/Boss'
import { defaultBossConfig } from '../../boss/configs/BossConfig'
import { setBossContext, clearBossContext, bossSpellLibrary } from '../../boss/spellLibrary'
import { Health } from '../../components'

export class Level2 extends BaseScene {
    private boss!: Boss
    private lastMeleeTime: number = 0
    private meleeCooldown: number = 1000 // 1秒冷却

    // Boss状态UI
    private bossStatePanel!: Phaser.GameObjects.Container
    private bossStateText!: Phaser.GameObjects.Text
    private hintText!: Phaser.GameObjects.Text

    constructor() { super({ key: 'Level2' }) }

    protected onLevelCreate(): void {
        this.setTaskInfo(
            "Programming Magic Boss",
            [
                "Phase 1: Color Match",
                "  Red→Fire | Blue→Ice",
                "Phase 2: Break Shields",
                "  Use loops (5 shields)",
                "Phase 3: Find Real Boss",
                "  Attack correct phantom",
                "",
                "TAB: Spell Editor",
                "1: Cast Spell",
                "SPACE: Melee Attack"
            ]
        )

        // Initialize Boss entity
        this.boss = new Boss(this, 480, 200, {
            ...defaultBossConfig,
            maxHealth: 800 // 降低血量以适应解谜难度
        })

        // Set Boss context for spell library
        setBossContext(this.boss, this)

        this.boss.on('defeated', () => {
            this.showInstruction("Guardian defeated! You mastered programming magic!")
            this.time.delayedCall(2000, () => {
                clearBossContext()
                this.scene.start('LevelSelectScene')
            })
        })

        this.boss.on('attackHit', (_dmg: number) => {
            this.cameras.main.shake(100, 0.01)
        })

        // 监听Boss阶段事件
        this.boss.on('phaseChanged', (data: { phase: number }) => {
            if (data.phase === 0) {
                this.showHint("Phase 1: Match Boss color with correct element!", 4000)
            } else if (data.phase === 1) {
                this.showHint("Phase 2: Break all shields using loops!", 4000)
            } else if (data.phase === 2) {
                this.showHint("Phase 3: Find the real Boss among phantoms!", 4000)
            }
        })

        // 监听错误攻击事件
        this.boss.on('wrongElement', (data: { expected: string, got: string }) => {
            this.showHint(`Wrong element! Boss needs ${data.expected}, not ${data.got}!`, 2000)
        })

        this.boss.on('shieldBlocked', () => {
            this.showHint("Shields are blocking! Destroy shields first!", 2000)
        })

        this.boss.on('hitPhantom', () => {
            this.showHint("Hit a phantom! Find the real Boss!", 2000)
        })

        // 创建Boss状态UI
        this.createBossStateUI()

        // Space键近战攻击
        this.input.keyboard!.on('keydown-SPACE', () => {
            this.performMeleeAttack()
        })

        // 开发者快捷键（数字键2-5执行测试符咒）
        this.setupDevShortcuts()

        // 显示初始提示
        this.showHint("Phase 1: Match Boss color! Use TAB to open spell editor.", 5000)
        this.showHint("[DEV] Press 2-5 for test spells", 3000)
    }

    /**
     * 开发者快捷键
     */
    private setupDevShortcuts(): void {
        // 按键2: 阶段1测试 - 颜色匹配攻击
        this.input.keyboard!.on('keydown-TWO', () => {
            this.executeTestSpell1()
        })

        // 按键3: 阶段2测试 - 破坏一个护盾
        this.input.keyboard!.on('keydown-THREE', () => {
            this.executeTestSpell2()
        })

        // 按键4: 阶段3测试 - 攻击所有位置
        this.input.keyboard!.on('keydown-FOUR', () => {
            this.executeTestSpell3()
        })

        // 按键5: 自动通关符咒
        this.input.keyboard!.on('keydown-FIVE', () => {
            this.executeAutoSpell()
        })
    }

    /**
     * 测试符咒1：颜色匹配
     */
    private executeTestSpell1(): void {
        const color = bossSpellLibrary['sc::getBossColor']()
        const positions = bossSpellLibrary['sc::getBossPositions']()

        if (positions.length > 0) {
            const pos = positions[0]
            if (color === 'red') {
                bossSpellLibrary['sc::fireBlast'](pos.x, pos.y)
                this.showHint("Casting FIRE blast!", 1000)
            } else {
                bossSpellLibrary['sc::iceBlast'](pos.x, pos.y)
                this.showHint("Casting ICE blast!", 1000)
            }
        }
    }

    /**
     * 测试符咒2：破坏护盾
     */
    private executeTestSpell2(): void {
        const shieldCount = bossSpellLibrary['sc::getShieldCount']()
        if (shieldCount > 0) {
            // 破坏第一个未破坏的护盾
            for (let i = 0; i < 5; i++) {
                if (bossSpellLibrary['sc::shootAtShield'](i)) {
                    this.showHint(`Shield ${i} destroyed!`, 1000)
                    break
                }
            }
        } else {
            this.showHint("No shields to destroy!", 1000)
        }
    }

    /**
     * 测试符咒3：攻击所有幻影
     */
    private executeTestSpell3(): void {
        const positions = bossSpellLibrary['sc::getBossPositions']()
        positions.forEach((pos: any) => {
            bossSpellLibrary['sc::attackPosition'](pos.x, pos.y)
        })
        this.showHint(`Attacking ${positions.length} positions!`, 1000)
    }

    /**
     * 自动通关符咒
     */
    private executeAutoSpell(): void {
        const phase = bossSpellLibrary['sc::getBossPhase']()

        if (phase === 0) {
            // 阶段1：颜色匹配
            this.executeTestSpell1()
        } else if (phase === 1) {
            // 阶段2：破盾
            this.executeTestSpell2()
        } else {
            // 阶段3：攻击幻影
            this.executeTestSpell3()
        }
    }

    protected onLevelUpdate(): void {
        // Player movement
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

            // 检测Boss技能伤害区域碰撞
            this.checkBossSkillCollisions(playerEid, playerBody)
        }

        // 更新Boss状态UI
        this.updateBossStateUI()
    }

    /**
     * 检测Boss技能伤害区域与玩家的碰撞
     */
    private checkBossSkillCollisions(playerEid: number, playerBody: any): void {
        const hitboxManager = (this.boss as any).hitboxManager
        if (!hitboxManager) return

        const zone = hitboxManager.checkPointCollision(playerBody.x, playerBody.y)
        if (zone) {
            // 玩家在伤害区域内，造成伤害
            Health.current[playerEid] = Math.max(0, Health.current[playerEid] - zone.damage)

            // 调用onHit回调
            if (zone.onHit) {
                zone.onHit(playerBody)
            }

            // 视觉反馈
            this.cameras.main.shake(150, 0.01)
            playerBody.setTint(0xff0000)
            this.time.delayedCall(100, () => {
                playerBody.clearTint()
            })

            // 立即移除该区域，防止重复伤害
            hitboxManager.removeZone(zone)
        }
    }

    /**
     * 玩家近战攻击
     */
    private performMeleeAttack(): void {
        const now = Date.now()
        if (now - this.lastMeleeTime < this.meleeCooldown) {
            this.showHint("Melee on cooldown!", 1000)
            return
        }

        this.lastMeleeTime = now

        const playerEid = this.world.resources.playerEid
        const playerBody = this.world.resources.bodies.get(playerEid)
        if (!playerBody) return

        const bossPos = this.boss.getPosition()
        const distance = Phaser.Math.Distance.Between(
            playerBody.x, playerBody.y,
            bossPos.x, bossPos.y
        )

        const meleeRange = 100

        if (distance < meleeRange) {
            // 击中Boss
            this.boss.takeDamage(20)
            this.createMeleeEffect(playerBody.x, playerBody.y, bossPos.x, bossPos.y)
            this.showHint("Melee hit! 20 damage", 1000)
        } else {
            // 未击中
            this.createMeleeEffect(playerBody.x, playerBody.y, bossPos.x, bossPos.y)
            this.showHint("Too far! Get closer to Boss.", 1500)
        }
    }

    /**
     * 创建近战特效
     */
    private createMeleeEffect(fromX: number, fromY: number, toX: number, toY: number): void {
        const slash = this.add.graphics()
        slash.lineStyle(4, 0xffff00, 1)

        const angle = Math.atan2(toY - fromY, toX - fromX)
        const length = 80

        const endX = fromX + Math.cos(angle) * length
        const endY = fromY + Math.sin(angle) * length

        slash.lineBetween(fromX, fromY, endX, endY)

        // 粒子效果
        for (let i = 0; i < 5; i++) {
            const particle = this.add.circle(
                fromX + Math.random() * 40 - 20,
                fromY + Math.random() * 40 - 20,
                3,
                0xffff00,
                0.8
            )
            this.tweens.add({
                targets: particle,
                x: endX + Math.random() * 20 - 10,
                y: endY + Math.random() * 20 - 10,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
            })
        }

        this.tweens.add({
            targets: slash,
            alpha: 0,
            duration: 300,
            onComplete: () => slash.destroy()
        })
    }

    /**
     * 创建Boss状态UI
     */
    private createBossStateUI(): void {
        this.bossStatePanel = this.add.container(20, 100).setScrollFactor(0).setDepth(1000)

        const bg = this.add.graphics()
        bg.fillStyle(0x1a1f2e, 0.9)
        bg.fillRoundedRect(0, 0, 220, 100, 8)
        bg.lineStyle(2, 0xff6600, 0.8)
        bg.strokeRoundedRect(0, 0, 220, 100, 8)

        const title = this.add.text(110, 12, 'BOSS STATUS', {
            fontSize: '13px',
            color: '#ff6600',
            fontStyle: 'bold'
        }).setOrigin(0.5)

        this.bossStateText = this.add.text(10, 32, '', {
            fontSize: '11px',
            color: '#ffffff',
            lineSpacing: 3,
            wordWrap: { width: 200 }
        })

        this.bossStatePanel.add([bg, title, this.bossStateText])

        // 提示文本
        this.hintText = this.add.text(480, 500, '', {
            fontSize: '16px',
            color: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001)
    }

    /**
     * 更新Boss状态UI
     */
    private updateBossStateUI(): void {
        // 从Boss获取实际状态
        const bossHealth = (this.boss as any).store?.get('health') || 800
        const bossMaxHealth = (this.boss as any).store?.get('maxHealth') || 800
        const healthPercent = Math.floor((bossHealth / bossMaxHealth) * 100)

        // 获取当前阶段
        const phase = (this.boss as any).programmingPhase || 0
        let phaseText = ''
        let phaseHint = ''

        if (phase === 0) {
            const color = (this.boss as any).getCurrentColor ? (this.boss as any).getCurrentColor() : 'red'
            phaseText = `P1: Color Match`
            phaseHint = `Boss: ${color.toUpperCase()}\n${color === 'red' ? 'Fire' : 'Ice'} spell needed!`
        } else if (phase === 1) {
            const shields = (this.boss as any).getShieldCount ? (this.boss as any).getShieldCount() : 0
            phaseText = `P2: Shields`
            phaseHint = `${shields} shields left\nUse loops!`
        } else if (phase === 2) {
            phaseText = `P3: Phantoms`
            phaseHint = `Find real Boss\nCheck positions!`
        }

        this.bossStateText.setText([
            `${phaseText}`,
            `HP: ${healthPercent}%`,
            ``,
            phaseHint
        ])
    }

    /**
     * 显示提示
     */
    private showHint(text: string, duration: number = 3000): void {
        this.hintText.setText(text)
        this.hintText.setAlpha(1)

        this.tweens.add({
            targets: this.hintText,
            alpha: 0,
            duration: 1000,
            delay: duration - 1000
        })
    }

    /**
     * Scene cleanup
     */
    shutdown(): void {
        clearBossContext()
    }
}
