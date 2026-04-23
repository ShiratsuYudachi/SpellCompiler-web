/**
 * SkillSelector - text
 * text
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
   * textoneexecute
   */
  selectSkill(
    availableSkills: BossSkill[],
    context: SelectionContext
  ): BossSkill | null {
    if (availableSkills.length === 0) {
      return null;
    }
    
    // text
    const dx = context.playerX - context.bossX;
    const dy = context.playerY - context.bossY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // textandphaseSelected skill
    const scoredSkills = availableSkills.map(skill => {
      const config = skill.getConfig();
      let score = config.priority; // text
      
      // text
      if (distance < 100) {
        // text:text
        if (config.name.includes('Melee') || config.name.includes('Slash')) {
          score += 5;
        }
      } else if (distance > 200) {
        // text:text
        if (config.name.includes('Ranged') || config.name.includes('Rush')) {
          score += 5;
        }
      }
      
      // text:text
      if (config.phase === context.currentPhase) {
        score += 3;
      }
      
      // text:text
      const healthPercent = context.bossHealth / context.bossMaxHealth;
      if (healthPercent < 0.3 && config.damage > 50) {
        score += 4;
      }
      
      return { skill, score };
    });
    
    // text
    scoredSkills.sort((a, b) => b.score - a.score);
    
    // text3textone(text)
    const topSkills = scoredSkills.slice(0, Math.min(3, scoredSkills.length));
    const randomIndex = Math.floor(Math.random() * topSkills.length);
    
    return topSkills[randomIndex].skill;
  }
  
  /**
   * text(random)
   */
  selectRandom(availableSkills: BossSkill[]): BossSkill | null {
    if (availableSkills.length === 0) {
      return null;
    }
    
    const randomIndex = Math.floor(Math.random() * availableSkills.length);
    return availableSkills[randomIndex];
  }
}
