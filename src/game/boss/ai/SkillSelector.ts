/**
 * SkillSelector - 技能选择器
 * 根据当前状态选择最合适的技能
 */

import { BossSkill } from '../skills/BossSkill';

export interface SelectionContext {
  bossX: number;
  bossY: number;
  playerX: number;
  playerY: number;
  bossHealth: number;
  bossMaxHealth: number;
  currentPhase: number;
  isAttacking: boolean;
}

export class SkillSelector {
  /**
   * 从可用技能中选择一个执行
   */
  selectSkill(
    availableSkills: BossSkill[],
    context: SelectionContext
  ): BossSkill | null {
    if (availableSkills.length === 0) {
      return null;
    }
    
    // 计算到玩家的距离
    const dx = context.playerX - context.bossX;
    const dy = context.playerY - context.bossY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 根据距离和阶段选择技能
    const scoredSkills = availableSkills.map(skill => {
      const config = skill.getConfig();
      let score = config.priority; // 基础分数来自优先级
      
      // 距离因素
      if (distance < 100) {
        // 近距离：优先近战技能
        if (config.name.includes('Melee') || config.name.includes('Slash')) {
          score += 5;
        }
      } else if (distance > 200) {
        // 远距离：优先远程技能
        if (config.name.includes('Ranged') || config.name.includes('Rush')) {
          score += 5;
        }
      }
      
      // 阶段因素：当前阶段的技能优先级更高
      if (config.phase === context.currentPhase) {
        score += 3;
      }
      
      // 血量因素：低血量时优先强力技能
      const healthPercent = context.bossHealth / context.bossMaxHealth;
      if (healthPercent < 0.3 && config.damage > 50) {
        score += 4;
      }
      
      return { skill, score };
    });
    
    // 按分数排序
    scoredSkills.sort((a, b) => b.score - a.score);
    
    // 前3个技能中随机选一个（增加变化性）
    const topSkills = scoredSkills.slice(0, Math.min(3, scoredSkills.length));
    const randomIndex = Math.floor(Math.random() * topSkills.length);
    
    return topSkills[randomIndex].skill;
  }
  
  /**
   * 简单的技能选择（随机）
   */
  selectRandom(availableSkills: BossSkill[]): BossSkill | null {
    if (availableSkills.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * availableSkills.length);
    return availableSkills[randomIndex];
  }
}
