/**
 * SpaceCollapseSkill - 空间坍缩（修复版）
 * 黑洞出现在玩家脚下
 */

import Phaser from 'phaser';
import { BossSkill, SkillPhase } from '../BossSkill';

export class SpaceCollapseSkill extends BossSkill {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'SpaceCollapse',
      damage: 80,
      cooldown: 18.0,
      phase: SkillPhase.Phase2,
      priority: 7,
    });
  }
  
  async execute(_bossX: number, _bossY: number, playerX: number, playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[SpaceCollapse] 玩家脚下黑洞');
    
    // 预警圈（玩家位置）
    const warning = this.scene.add.circle(playerX, playerY, 70, 0x8b00ff, 0);
    warning.setStrokeStyle(3, 0x8b00ff, 1);
    
    this.scene.tweens.add({
      targets: warning,
      alpha: { from: 0, to: 0.5 },
      duration: 300,
      yoyo: true,
      repeat: 2
    });
    
    await this.delay(1500);
    warning.destroy();
    
    // 黑洞出现
    const blackhole = this.scene.add.circle(playerX, playerY, 5, 0x000000, 1);
    blackhole.setStrokeStyle(4, 0x8b00ff, 1);
    
    this.scene.tweens.add({
      targets: blackhole,
      radius: 60,
      duration: 500,
      ease: 'Cubic.easeOut'
    });
    
    // 拉扯玩家
    const pullLoop = this.scene.time.addEvent({
      delay: 100,
      callback: () => {
        const player = this.scene.children.getByName('player') as any;
        if (!player) return;
        
        const dx = blackhole.x - player.x;
        const dy = blackhole.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 60) {
          // 中心伤害
          this.damagePlayer(this.config.damage);

          // 爆炸
          for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            const particle = this.scene.add.circle(
              blackhole.x,
              blackhole.y,
              4,
              0x8b00ff
            );
            
            this.scene.tweens.add({
              targets: particle,
              x: blackhole.x + Math.cos(angle) * 80,
              y: blackhole.y + Math.sin(angle) * 80,
              alpha: 0,
              duration: 500,
              onComplete: () => particle.destroy()
            });
          }
          
          pullLoop.destroy();
          blackhole.destroy();
        } else if (dist < 150) {
          // 拉扯力
          const pullStrength = 150;
          player.x += (dx / dist) * pullStrength * 0.016;
          player.y += (dy / dist) * pullStrength * 0.016;
        }
      },
      loop: true
    });
    
    await this.delay(3000);
    pullLoop.destroy();
    
    this.scene.tweens.add({
      targets: blackhole,
      scale: 0,
      alpha: 0,
      duration: 300,
      onComplete: () => blackhole.destroy()
    });
    
    this.onComplete();
  }
}
