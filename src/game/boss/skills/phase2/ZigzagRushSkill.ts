/**
 * ZigzagRushSkill - 折线突袭（修复版）
 * Boss向玩家进行3次冲撞挥砍
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';

export class ZigzagRushSkill extends BossSkill {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'ZigzagRush',
      damage: 25,
      cooldown: 8.0,
      phase: SkillPhase.Phase2,
      priority: 8,
    });
  }
  
  async execute(bossX: number, bossY: number, playerX: number, playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[ZigzagRush] 3次冲撞挥砍');
    
    for (let i = 0; i < 3; i++) {
      await this.rushAndSlash(bossX, bossY, playerX, playerY);
      await this.delay(400);
    }
    
    this.onComplete();
  }
  
  private async rushAndSlash(startX: number, startY: number, targetX: number, targetY: number): Promise<void> {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // 更新玩家位置
    targetX = player.x;
    targetY = player.y;
    
    // 警告闪光
    const flash = this.scene.add.circle(startX, startY, 40, 0xff00ff, 0.6);
    this.scene.tweens.add({
      targets: flash,
      scale: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => flash.destroy()
    });
    
    await this.delay(300);
    
    // Boss冲刺
    const boss = this.scene.children.getByName('boss-container') as any;
    if (!boss) return;
    
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const rushDuration = Math.min((distance / 600) * 1000, 500);
    
    // 残影
    const phantom = this.scene.add.circle(startX, startY, 30, 0x8b00ff, 0.3);
    this.scene.tweens.add({
      targets: phantom,
      alpha: 0,
      duration: 400,
      onComplete: () => phantom.destroy()
    });
    
    // 冲刺动画
    this.scene.tweens.add({
      targets: boss,
      x: targetX,
      y: targetY,
      duration: rushDuration,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // 挥砍
        const slashGraphics = this.scene.add.graphics();
        slashGraphics.lineStyle(8, 0xff00ff, 1);
        slashGraphics.arc(boss.x, boss.y, 70, -Math.PI * 0.6, Math.PI * 0.6, false);
        slashGraphics.strokePath();
        
        // 检测伤害
        const dist = Phaser.Math.Distance.Between(boss.x, boss.y, player.x, player.y);
        if (dist < 70 && player.takeDamage) {
          player.takeDamage(this.config.damage);
          
          // 击退
          const dx = player.x - boss.x;
          const dy = player.y - boss.y;
          const knockbackDist = Math.sqrt(dx * dx + dy * dy);
          if (knockbackDist > 0) {
            player.x += (dx / knockbackDist) * 30;
            player.y += (dy / knockbackDist) * 30;
          }
        }
        
        this.scene.tweens.add({
          targets: slashGraphics,
          alpha: 0,
          duration: 300,
          onComplete: () => slashGraphics.destroy()
        });
      }
    });
    
    await this.delay(rushDuration + 200);
  }
}
