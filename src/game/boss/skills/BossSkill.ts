/**
 * BossSkill - Boss技能基类
 * 所有Boss技能都继承此类
 */

import Phaser from 'phaser';

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
}
