/**
 * BossSkill - Bosstext
 * allBosstext
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
  cooldown: number;       // text(sec)
  phase: SkillPhase;      // text
  priority: number;       // priority(1-10)
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
   * text
   */
  canUse(currentTime: number): boolean {
    if (this.isExecuting) return false;
    
    const timeSinceLastUse = (currentTime - this.lastUsedTime) / 1000;
    return timeSinceLastUse >= this.config.cooldown;
  }
  
  /**
   * Execute skill(async)
   * text
   */
  abstract execute(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void>;
  
  /**
   * text
   */
  protected onComplete(): void {
    this.isExecuting = false;
  }
  
  /**
   * text
   */
  getConfig(): SkillConfig {
    return this.config;
  }
  
  /**
   * text
   */
  getName(): string {
    return this.config.name;
  }
  
  /**
   * text
   */
  getCooldown(): number {
    return this.config.cooldown;
  }
  
  /**
   * text
   */
  getLastUsedTime(): number {
    return this.lastUsedTime;
  }
  
  /**
   * text
   */
  setLastUsedTime(time: number): void {
    this.lastUsedTime = time;
  }
  
  /**
   * text
   */
  resetCooldown(): void {
    this.lastUsedTime = 0;
  }
  
  /**
   * text
   */
  destroy(): void {
    // text
  }

  /**
   * text
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => this.scene.time.delayedCall(ms, resolve));
  }
}
