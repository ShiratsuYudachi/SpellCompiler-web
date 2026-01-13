/**
 * SpellProgramEditor - 游戏内法术编辑器
 *
 * 提供简化的可视化编程界面，让玩家在战斗中调整法术逻辑
 */

import Phaser from 'phaser'

// 法术节点类型
export enum SpellNodeType {
    Condition = 'condition',     // 条件判断
    Loop = 'loop',              // 循环
    Action = 'action',          // 动作
    Variable = 'variable'       // 变量
}

// 法术节点
export interface SpellNode {
    id: string
    type: SpellNodeType
    label: string
    config: any  // 节点特定配置
}

// 预设法术程序
export const PRESET_SPELLS = {
    // 1. 基础法术：简单连射
    basic: {
        name: "Basic Burst",
        description: "Simple 3-shot burst attack",
        nodes: [
            {
                id: 'action1',
                type: SpellNodeType.Action,
                label: 'Shoot 3 bullets',
                config: { count: 3, spread: 10 }
            }
        ],
        code: `
// When: Always
// Do: Shoot 3 bullets with 10° spread
return { shoot: true, count: 3, spread: 10 };
        `.trim()
    },

    // 2. 条件法术：根据Boss阶段调整
    conditional: {
        name: "Phase Adaptive",
        description: "Adapt to Boss phase",
        nodes: [
            {
                id: 'cond1',
                type: SpellNodeType.Condition,
                label: 'If Boss Phase >= 2',
                config: { condition: 'bossPhase >= 2' }
            },
            {
                id: 'action1',
                type: SpellNodeType.Action,
                label: 'Shoot 5 bullets',
                config: { count: 5, spread: 15 }
            },
            {
                id: 'action2',
                type: SpellNodeType.Action,
                label: 'Shoot 2 bullets',
                config: { count: 2, spread: 5 }
            }
        ],
        code: `
// If Boss is in Phase 2+, shoot 5 bullets
// Otherwise, shoot 2 bullets
if (bossPhase >= 2) {
    return { shoot: true, count: 5, spread: 15 };
} else {
    return { shoot: true, count: 2, spread: 5 };
}
        `.trim()
    },

    // 3. 循环法术：递增攻击
    recursive: {
        name: "Escalating Barrage",
        description: "Increase shots each cast",
        nodes: [
            {
                id: 'var1',
                type: SpellNodeType.Variable,
                label: 'attackCount = 0',
                config: { name: 'attackCount', initial: 0 }
            },
            {
                id: 'loop1',
                type: SpellNodeType.Loop,
                label: 'attackCount++',
                config: { increment: 1 }
            },
            {
                id: 'action1',
                type: SpellNodeType.Action,
                label: 'Shoot (attackCount) bullets',
                config: { count: 'attackCount', spread: 20 }
            }
        ],
        code: `
// Track attack count (persists between casts)
attackCount = (attackCount || 0) + 1;
const shots = Math.min(attackCount, 7); // Cap at 7

return { shoot: true, count: shots, spread: 20 };
        `.trim()
    },

    // 4. 状态法术：模式识别
    pattern: {
        name: "Pattern Hunter",
        description: "Detect Boss attack patterns",
        nodes: [
            {
                id: 'var1',
                type: SpellNodeType.Variable,
                label: 'bossPatterns = []',
                config: { name: 'bossPatterns', initial: [] }
            },
            {
                id: 'cond1',
                type: SpellNodeType.Condition,
                label: 'If pattern repeats',
                config: { condition: 'detectRepeat(bossPatterns)' }
            },
            {
                id: 'action1',
                type: SpellNodeType.Action,
                label: 'Heavy attack (7 bullets)',
                config: { count: 7, spread: 30 }
            },
            {
                id: 'action2',
                type: SpellNodeType.Action,
                label: 'Normal attack (3 bullets)',
                config: { count: 3, spread: 10 }
            }
        ],
        code: `
// Record Boss skill usage
bossPatterns = bossPatterns || [];
bossPatterns.push(currentBossSkill);
if (bossPatterns.length > 5) bossPatterns.shift();

// Detect pattern: if last 3 are same
const isRepeat = bossPatterns.length >= 3 &&
    bossPatterns.slice(-3).every(s => s === bossPatterns[bossPatterns.length - 1]);

if (isRepeat) {
    return { shoot: true, count: 7, spread: 30 }; // Exploit weakness!
} else {
    return { shoot: true, count: 3, spread: 10 };
}
        `.trim()
    }
}

/**
 * 游戏内法术编辑器UI
 */
export class SpellProgramEditor {
    private scene: Phaser.Scene
    private container: Phaser.GameObjects.Container
    private isVisible: boolean = false

    private currentSpell: keyof typeof PRESET_SPELLS = 'basic'
    private spellState: Map<string, any> = new Map()

    // UI组件
    private background!: Phaser.GameObjects.Rectangle
    private titleText!: Phaser.GameObjects.Text
    private descriptionText!: Phaser.GameObjects.Text
    private codeText!: Phaser.GameObjects.Text
    private spellButtons: Phaser.GameObjects.Text[] = []

    constructor(scene: Phaser.Scene) {
        this.scene = scene
        this.container = scene.add.container(0, 0)
        this.container.setDepth(10000)
        this.container.setVisible(false)

        this.createUI()
        this.setupInput()
    }

    private createUI(): void {
        // 半透明背景
        this.background = this.scene.add.rectangle(
            960 / 2, 540 / 2,
            800, 480,
            0x000000, 0.9
        )
        this.background.setStrokeStyle(3, 0x00ffff)
        this.container.add(this.background)

        // 标题
        this.titleText = this.scene.add.text(960 / 2, 80, 'Spell Program Editor', {
            fontSize: '32px',
            color: '#00ffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        })
        this.titleText.setOrigin(0.5)
        this.container.add(this.titleText)

        // 说明
        const instructions = this.scene.add.text(
            960 / 2, 120,
            'Press [E] to open/close editor | Select a spell program:',
            {
                fontSize: '14px',
                color: '#aaaaaa',
                align: 'center'
            }
        )
        instructions.setOrigin(0.5)
        this.container.add(instructions)

        // 法术描述
        this.descriptionText = this.scene.add.text(960 / 2, 160, '', {
            fontSize: '16px',
            color: '#ffff00',
            align: 'center'
        })
        this.descriptionText.setOrigin(0.5)
        this.container.add(this.descriptionText)

        // 法术代码显示
        this.codeText = this.scene.add.text(100, 200, '', {
            fontSize: '13px',
            color: '#00ff00',
            fontFamily: 'monospace',
            backgroundColor: '#1a1a1a',
            padding: { x: 10, y: 10 },
            wordWrap: { width: 740 }
        })
        this.container.add(this.codeText)

        // 法术选择按钮
        this.createSpellButtons()
    }

    private createSpellButtons(): void {
        const spellKeys = Object.keys(PRESET_SPELLS) as (keyof typeof PRESET_SPELLS)[]
        const startY = 410
        const spacing = 150

        spellKeys.forEach((key, index) => {
            const spell = PRESET_SPELLS[key]
            const x = 150 + index * spacing

            const button = this.scene.add.text(x, startY, `[${index + 1}] ${spell.name}`, {
                fontSize: '14px',
                color: '#ffffff',
                backgroundColor: '#333333',
                padding: { x: 10, y: 8 }
            })
            button.setOrigin(0.5)
            button.setInteractive({ useHandCursor: true })

            button.on('pointerover', () => {
                button.setBackgroundColor('#555555')
            })

            button.on('pointerout', () => {
                button.setBackgroundColor(key === this.currentSpell ? '#00aa00' : '#333333')
            })

            button.on('pointerdown', () => {
                this.selectSpell(key)
            })

            this.spellButtons.push(button)
            this.container.add(button)
        })

        // 初始选择
        this.selectSpell('basic')
    }

    private setupInput(): void {
        // [E] 键打开/关闭编辑器
        this.scene.input.keyboard!.on('keydown-E', () => {
            this.toggle()
        })

        // 数字键快速选择
        const spellKeys = Object.keys(PRESET_SPELLS) as (keyof typeof PRESET_SPELLS)[]
        spellKeys.forEach((key, index) => {
            const keyName = `keydown-${index + 1}`
            this.scene.input.keyboard!.on(keyName, () => {
                if (this.isVisible) {
                    this.selectSpell(key)
                }
            })
        })
    }

    /**
     * 选择法术程序
     */
    public selectSpell(spellKey: keyof typeof PRESET_SPELLS): void {
        this.currentSpell = spellKey
        const spell = PRESET_SPELLS[spellKey]

        this.descriptionText.setText(spell.description)
        this.codeText.setText(spell.code)

        // 更新按钮样式
        const spellKeys = Object.keys(PRESET_SPELLS) as (keyof typeof PRESET_SPELLS)[]
        this.spellButtons.forEach((button, index) => {
            const isSelected = spellKeys[index] === spellKey
            button.setBackgroundColor(isSelected ? '#00aa00' : '#333333')
        })

        // 重置状态
        this.spellState.clear()

        console.log(`[SpellEditor] Selected spell: ${spell.name}`)
    }

    /**
     * 执行当前法术程序
     */
    public executeSpell(context: {
        bossPhase: number
        bossHealth: number
        bossMaxHealth: number
        currentBossSkill: string
    }): { shoot: boolean; count: number; spread: number } {
        const spell = PRESET_SPELLS[this.currentSpell]

        try {
            // 创建执行上下文
            const bossPhase = context.bossPhase
            const bossHealthPercent = context.bossHealth / context.bossMaxHealth
            const currentBossSkill = context.currentBossSkill

            // 持久化状态变量
            let attackCount = this.spellState.get('attackCount') || 0
            let bossPatterns = this.spellState.get('bossPatterns') || []

            // 执行法术逻辑（根据当前选择）
            let result: { shoot: boolean; count: number; spread: number }

            switch (this.currentSpell) {
                case 'basic':
                    result = { shoot: true, count: 3, spread: 10 }
                    break

                case 'conditional':
                    if (bossPhase >= 2) {
                        result = { shoot: true, count: 5, spread: 15 }
                    } else {
                        result = { shoot: true, count: 2, spread: 5 }
                    }
                    break

                case 'recursive':
                    attackCount++
                    const shots = Math.min(attackCount, 7)
                    this.spellState.set('attackCount', attackCount)
                    result = { shoot: true, count: shots, spread: 20 }
                    break

                case 'pattern':
                    bossPatterns.push(currentBossSkill)
                    if (bossPatterns.length > 5) bossPatterns.shift()
                    this.spellState.set('bossPatterns', bossPatterns)

                    const isRepeat = bossPatterns.length >= 3 &&
                        bossPatterns.slice(-3).every(s => s === bossPatterns[bossPatterns.length - 1])

                    if (isRepeat) {
                        result = { shoot: true, count: 7, spread: 30 }
                    } else {
                        result = { shoot: true, count: 3, spread: 10 }
                    }
                    break

                default:
                    result = { shoot: true, count: 1, spread: 0 }
            }

            return result

        } catch (error) {
            console.error('[SpellEditor] Execution error:', error)
            return { shoot: false, count: 0, spread: 0 }
        }
    }

    /**
     * 切换编辑器显示
     */
    public toggle(): void {
        this.isVisible = !this.isVisible
        this.container.setVisible(this.isVisible)

        // 暂停/恢复游戏（如果需要）
        if (this.isVisible) {
            this.scene.scene.pause()
        } else {
            this.scene.scene.resume()
        }
    }

    public show(): void {
        this.isVisible = true
        this.container.setVisible(true)
    }

    public hide(): void {
        this.isVisible = false
        this.container.setVisible(false)
    }

    public getCurrentSpell(): keyof typeof PRESET_SPELLS {
        return this.currentSpell
    }

    public destroy(): void {
        this.container.destroy()
    }
}
