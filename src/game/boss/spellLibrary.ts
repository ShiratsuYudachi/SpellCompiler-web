/**
 * Boss专用符咒库函数
 *
 * 提供给玩家在符咒编辑器中使用的函数，用于查询Boss状态和执行攻击
 */

import type { Boss } from './entities/Boss'

// 全局Boss引用（由Level2设置）
let currentBoss: Boss | null = null
let currentScene: Phaser.Scene | null = null

/**
 * 设置当前Boss和Scene（由Level2调用）
 */
export function setBossContext(boss: Boss, scene: Phaser.Scene) {
    currentBoss = boss
    currentScene = scene
}

/**
 * 清除Boss上下文
 */
export function clearBossContext() {
    currentBoss = null
    currentScene = null
}

/**
 * Boss符咒库函数
 */
export const bossSpellLibrary = {
    /**
     * 获取Boss当前颜色
     * 阶段1使用：红色/蓝色状态切换
     */
    'sc::getBossColor': (): string => {
        if (!currentBoss) return 'unknown'
        return (currentBoss as any).getCurrentColor ? (currentBoss as any).getCurrentColor() : 'red'
    },

    /**
     * 获取Boss当前阶段
     * 返回 0(Phase 1), 1(Phase 2), 2(Phase 3)
     */
    'sc::getBossPhase': (): number => {
        if (!currentBoss) return 0
        const health = (currentBoss as any).store?.get('health') || 800
        const maxHealth = (currentBoss as any).store?.get('maxHealth') || 800
        const healthPercent = health / maxHealth

        if (healthPercent > 0.6) return 0 // Phase 1
        if (healthPercent > 0.3) return 1 // Phase 2
        return 2 // Phase 3
    },

    /**
     * 获取Boss护盾数量
     * 阶段2使用：返回剩余护盾数(0-5)
     */
    'sc::getShieldCount': (): number => {
        if (!currentBoss) return 0
        return (currentBoss as any).getShieldCount ? (currentBoss as any).getShieldCount() : 0
    },

    /**
     * 获取所有Boss位置
     * 阶段3使用：返回[{x, y, isReal: boolean}]
     */
    'sc::getBossPositions': (): Array<{x: number, y: number, isReal: boolean}> => {
        if (!currentBoss) return []
        return (currentBoss as any).getBossPositions ? (currentBoss as any).getBossPositions() : []
    },

    /**
     * 发射火球
     * 参数：目标x, y坐标
     * 返回：是否成功发射
     */
    'sc::fireBlast': (targetX: number, targetY: number): boolean => {
        if (!currentScene || !currentBoss) return false

        const playerEid = (currentScene as any).world?.resources?.playerEid
        const playerBody = (currentScene as any).world?.resources?.bodies?.get(playerEid)
        if (!playerBody) return false

        // 创建火球
        const fireball = currentScene.add.circle(playerBody.x, playerBody.y, 10, 0xff3300, 0.9)
        fireball.setStrokeStyle(2, 0xff6600)
        currentScene.physics.add.existing(fireball)
        const body = (fireball.body as Phaser.Physics.Arcade.Body)

        // 计算速度
        const dx = targetX - playerBody.x
        const dy = targetY - playerBody.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 500

        if (distance > 0) {
            body.setVelocity((dx / distance) * speed, (dy / distance) * speed)
        }

        // 碰撞检测（简化版）
        currentScene.time.addEvent({
            delay: 50,
            repeat: 40,
            callback: () => {
                const bossPos = currentBoss!.getPosition()
                const dist = Phaser.Math.Distance.Between(fireball.x, fireball.y, bossPos.x, bossPos.y)
                if (dist < 80) {
                    // 命中Boss
                    if ((currentBoss as any).takeElementalDamage) {
                        (currentBoss as any).takeElementalDamage(15, 'fire')
                    } else {
                        currentBoss!.takeDamage(15)
                    }
                    fireball.destroy()
                }
            }
        })

        // 自动销毁
        currentScene.time.delayedCall(2000, () => {
            if (fireball.active) fireball.destroy()
        })

        return true
    },

    /**
     * 发射冰球
     * 参数：目标x, y坐标
     * 返回：是否成功发射
     */
    'sc::iceBlast': (targetX: number, targetY: number): boolean => {
        if (!currentScene || !currentBoss) return false

        const playerEid = (currentScene as any).world?.resources?.playerEid
        const playerBody = (currentScene as any).world?.resources?.bodies?.get(playerEid)
        if (!playerBody) return false

        // 创建冰球
        const iceball = currentScene.add.circle(playerBody.x, playerBody.y, 10, 0x00ccff, 0.9)
        iceball.setStrokeStyle(2, 0x66ffff)
        currentScene.physics.add.existing(iceball)
        const body = (iceball.body as Phaser.Physics.Arcade.Body)

        // 计算速度
        const dx = targetX - playerBody.x
        const dy = targetY - playerBody.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 500

        if (distance > 0) {
            body.setVelocity((dx / distance) * speed, (dy / distance) * speed)
        }

        // 碰撞检测
        currentScene.time.addEvent({
            delay: 50,
            repeat: 40,
            callback: () => {
                const bossPos = currentBoss!.getPosition()
                const dist = Phaser.Math.Distance.Between(iceball.x, iceball.y, bossPos.x, bossPos.y)
                if (dist < 80) {
                    if ((currentBoss as any).takeElementalDamage) {
                        (currentBoss as any).takeElementalDamage(15, 'ice')
                    } else {
                        currentBoss!.takeDamage(15)
                    }
                    iceball.destroy()
                }
            }
        })

        currentScene.time.delayedCall(2000, () => {
            if (iceball.active) iceball.destroy()
        })

        return true
    },

    /**
     * 攻击指定护盾
     * 阶段2使用：攻击护盾索引(0-4)
     */
    'sc::shootAtShield': (index: number): boolean => {
        if (!currentBoss || index < 0 || index > 4) return false

        if ((currentBoss as any).destroyShield) {
            (currentBoss as any).destroyShield(index)
            return true
        }
        return false
    },

    /**
     * 攻击指定位置
     * 阶段3使用：攻击坐标
     */
    'sc::attackPosition': (x: number, y: number): boolean => {
        if (!currentScene || !currentBoss) return false

        const playerEid = (currentScene as any).world?.resources?.playerEid
        const playerBody = (currentScene as any).world?.resources?.bodies?.get(playerEid)
        if (!playerBody) return false

        // 创建魔法弹
        const bullet = currentScene.add.circle(playerBody.x, playerBody.y, 8, 0xffff00, 0.9)
        currentScene.physics.add.existing(bullet)
        const body = (bullet.body as Phaser.Physics.Arcade.Body)

        const dx = x - playerBody.x
        const dy = y - playerBody.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const speed = 600

        if (distance > 0) {
            body.setVelocity((dx / distance) * speed, (dy / distance) * speed)
        }

        // 碰撞检测
        currentScene.time.addEvent({
            delay: 50,
            repeat: 30,
            callback: () => {
                const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, x, y)
                if (dist < 50) {
                    // 检查是否命中真实Boss
                    const bossPos = currentBoss!.getPosition()
                    const hitDist = Phaser.Math.Distance.Between(x, y, bossPos.x, bossPos.y)
                    if (hitDist < 80) {
                        // 命中真实Boss
                        currentBoss!.takeDamage(12)
                    } else {
                        // 命中幻影
                        (currentBoss as any).emit('hitPhantom')
                    }
                    bullet.destroy()
                }
            }
        })

        currentScene.time.delayedCall(1500, () => {
            if (bullet.active) bullet.destroy()
        })

        return true
    },

    /**
     * 获取Boss到玩家的距离
     */
    'sc::getDistanceToBoss': (): number => {
        if (!currentScene || !currentBoss) return 9999

        const playerEid = (currentScene as any).world?.resources?.playerEid
        const playerBody = (currentScene as any).world?.resources?.bodies?.get(playerEid)
        if (!playerBody) return 9999

        const bossPos = currentBoss.getPosition()
        return Phaser.Math.Distance.Between(playerBody.x, playerBody.y, bossPos.x, bossPos.y)
    }
}
