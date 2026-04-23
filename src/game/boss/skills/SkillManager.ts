/**
 * SkillManager - text
 * textBosstext,selectandexecute
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
   * Register skill
   */
  registerSkill(skill: BossSkill): void {
    this.skills.set(skill.getName(), skill);
    console.log(`[SkillManager] Register skill: ${skill.getName()}`);
  }
  
  /**
   * text
   */
  registerSkills(skills: BossSkill[]): void {
    skills.forEach(skill => this.registerSkill(skill));
  }
  
  /**
   * text
   */
  getAvailableSkills(currentTime: number): BossSkill[] {
    const available: BossSkill[] = [];
    
    this.skills.forEach(skill => {
      const config = skill.getConfig();
      
      // textandcooldown
      if (config.phase <= this.currentPhase && skill.canUse(currentTime)) {
        available.push(skill);
      }
    });
    
    return available;
  }
  
  /**
   * text
   */
  getSkill(name: string): BossSkill | undefined {
    return this.skills.get(name);
  }
  
  /**
   * Execute skill
   */
  async executeSkill(
    skill: BossSkill,
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void> {
    if (this.isExecutingSkill) {
      console.warn('[SkillManager] Skill executing, ignore new request');
      return;
    }
    
    this.isExecutingSkill = true;
    skill.setLastUsedTime(Date.now());
    
    console.log(`[SkillManager] Execute skill: ${skill.getName()}`);
    
    try {
      await skill.execute(bossX, bossY, playerX, playerY);
    } catch (error) {
      console.error(`[SkillManager] Skill execution error:`, error);
    } finally {
      this.isExecutingSkill = false;
    }
  }
  
  /**
   * text
   */
  setPhase(phase: SkillPhase): void {
    this.currentPhase = phase;
    console.log(`[SkillManager] Switch to phase: ${phase + 1}`);
  }
  
  /**
   * text
   */
  getCurrentPhase(): SkillPhase {
    return this.currentPhase;
  }
  
  /**
   * textExecute skill
   */
  isExecuting(): boolean {
    return this.isExecutingSkill;
  }
  
  /**
   * text
   */
  resetAllCooldowns(): void {
    this.skills.forEach(skill => skill.resetCooldown());
  }
  
  /**
   * text
   */
  getAllSkills(): BossSkill[] {
    return Array.from(this.skills.values());
  }
  
  /**
   * destroy
   */
  destroy(): void {
    this.skills.forEach(skill => skill.destroy());
    this.skills.clear();
  }
}
