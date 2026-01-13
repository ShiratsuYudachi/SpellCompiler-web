/**
 * BossSkill - Boss技能基类
 * 所有Boss技能都继承此类
 */

import Phaser from 'phaser';
import { Health } from '../../components';

export enum SkillPhase {
  Phase1 = 0,
  Phase2 = 1,
  Phase3 = 2,
}

export interface SkillConfig {
  name: string;
  damage: number;
  cooldown: number;       // 冷却时间（秒）
  phase: SkillPhase;      // 所属阶段
  priority: number;       // 优先级（1-10）
}

export abstract class BossSkill {
  protected scene: Phaser.Scene;
  protected config: SkillConfig;
  protected isExecuting: boolean = false;
  protected lastUsedTime: number = 0;
  
  constructor(scene: Phaser.Scene, config: SkillConfig) {
    this.scene = scene;
    this.config = config;
  }
  
  /**
   * 检查技能是否可用
   */
  canUse(currentTime: number): boolean {
    if (this.isExecuting) return false;
    
    const timeSinceLastUse = (currentTime - this.lastUsedTime) / 1000;
    return timeSinceLastUse >= this.config.cooldown;
  }
  
  /**
   * 执行技能（异步）
   * 子类必须实现此方法
   */
  abstract execute(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void>;
  
  /**
   * 技能执行完毕的回调
   */
  protected onComplete(): void {
    this.isExecuting = false;
  }
  
  /**
   * 获取技能配置
   */
  getConfig(): SkillConfig {
    return this.config;
  }
  
  /**
   * 获取技能名称
   */
  getName(): string {
    return this.config.name;
  }
  
  /**
   * 获取技能冷却时间
   */
  getCooldown(): number {
    return this.config.cooldown;
  }
  
  /**
   * 获取上次使用时间
   */
  getLastUsedTime(): number {
    return this.lastUsedTime;
  }
  
  /**
   * 设置上次使用时间
   */
  setLastUsedTime(time: number): void {
    this.lastUsedTime = time;
  }
  
  /**
   * 重置冷却
   */
  resetCooldown(): void {
    this.lastUsedTime = 0;
  }
  
  /**
   * 销毁技能
   */
  destroy(): void {
    // 子类可以重写此方法清理资源
  }

  /**
   * 延迟辅助方法
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => this.scene.time.delayedCall(ms, resolve));
  }

  /**
   * 对玩家造成伤害 (ECS Health组件)
   * 替代不存在的player.takeDamage()方法
   */
  protected damagePlayer(damage: number, playerX?: number, playerY?: number): void {
    const level2Scene = this.scene as any;
    const playerEid = level2Scene.world?.resources?.playerEid;

    console.log('[BossSkill.damagePlayer] Called with:', {
      damage,
      playerEid,
      hasWorld: !!level2Scene.world,
      hasResources: !!level2Scene.world?.resources,
      currentHP: playerEid !== undefined ? Health.current[playerEid] : 'N/A'
    });

    if (playerEid !== undefined) {
      // 扣除血量
      const oldHP = Health.current[playerEid];
      Health.current[playerEid] = Math.max(0, Health.current[playerEid] - damage);
      const newHP = Health.current[playerEid];

      console.log('[BossSkill.damagePlayer] HP changed:', {
        oldHP,
        newHP,
        damage,
        playerEid
      });

      // 视觉反馈：相机震动
      this.scene.cameras.main.shake(150, 0.01);

      // 视觉反馈：玩家闪红
      const playerBody = level2Scene.world?.resources?.bodies?.get(playerEid);
      if (playerBody) {
        playerBody.setTint(0xff0000);
        this.scene.time.delayedCall(100, () => {
          playerBody.clearTint();
        });
      }
    } else {
      console.error('[BossSkill.damagePlayer] playerEid is undefined!');
    }
  }

  /**
   * 检查玩家是否在指定范围内
   */
  protected isPlayerInRange(centerX: number, centerY: number, radius: number): boolean {
    const level2Scene = this.scene as any;
    const playerBody = level2Scene.world?.resources?.bodies?.get(
      level2Scene.world?.resources?.playerEid
    );

    if (!playerBody) return false;

    const distance = Phaser.Math.Distance.Between(
      centerX, centerY, playerBody.x, playerBody.y
    );

    return distance <= radius;
  }
}
