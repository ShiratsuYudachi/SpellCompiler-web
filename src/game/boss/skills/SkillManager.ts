/**
 * SkillManager - 技能管理器
 * 管理所有Boss技能的注册、选择和执行
 */

import Phaser from 'phaser';
import { BossSkill, SkillPhase } from './BossSkill';

export class SkillManager {
  private skills: Map<string, BossSkill> = new Map();
  private currentPhase: SkillPhase = SkillPhase.Phase1;
  private isExecutingSkill: boolean = false;

  constructor(_scene: Phaser.Scene) {
    // Scene is stored in individual skills
  }
  
  /**
   * 注册技能
   */
  registerSkill(skill: BossSkill): void {
    this.skills.set(skill.getName(), skill);
    console.log(`[SkillManager] 注册技能: ${skill.getName()}`);
  }
  
  /**
   * 注册多个技能
   */
  registerSkills(skills: BossSkill[]): void {
    skills.forEach(skill => this.registerSkill(skill));
  }
  
  /**
   * 获取当前阶段可用的技能
   */
  getAvailableSkills(currentTime: number): BossSkill[] {
    const available: BossSkill[] = [];
    
    this.skills.forEach(skill => {
      const config = skill.getConfig();
      
      // 检查阶段和冷却
      if (config.phase <= this.currentPhase && skill.canUse(currentTime)) {
        available.push(skill);
      }
    });
    
    return available;
  }
  
  /**
   * 通过名称获取技能
   */
  getSkill(name: string): BossSkill | undefined {
    return this.skills.get(name);
  }
  
  /**
   * 执行技能
   */
  async executeSkill(
    skill: BossSkill,
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void> {
    if (this.isExecutingSkill) {
      console.warn('[SkillManager] 技能执行中，忽略新技能');
      return;
    }
    
    this.isExecutingSkill = true;
    skill.setLastUsedTime(Date.now());
    
    console.log(`[SkillManager] 执行技能: ${skill.getName()}`);
    
    try {
      await skill.execute(bossX, bossY, playerX, playerY);
    } catch (error) {
      console.error(`[SkillManager] 技能执行错误:`, error);
    } finally {
      this.isExecutingSkill = false;
    }
  }
  
  /**
   * 设置当前阶段
   */
  setPhase(phase: SkillPhase): void {
    this.currentPhase = phase;
    console.log(`[SkillManager] 切换到阶段: ${phase + 1}`);
  }
  
  /**
   * 获取当前阶段
   */
  getCurrentPhase(): SkillPhase {
    return this.currentPhase;
  }
  
  /**
   * 是否正在执行技能
   */
  isExecuting(): boolean {
    return this.isExecutingSkill;
  }
  
  /**
   * 重置所有技能冷却
   */
  resetAllCooldowns(): void {
    this.skills.forEach(skill => skill.resetCooldown());
  }
  
  /**
   * 获取所有技能
   */
  getAllSkills(): BossSkill[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    this.skills.forEach(skill => skill.destroy());
    this.skills.clear();
  }
}
