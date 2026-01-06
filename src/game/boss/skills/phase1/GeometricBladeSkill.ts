/**
 * GeometricBladeSkill - 几何飞刃（修复版）
 * 3把旋转几何飞刃射向玩家
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';

export class GeometricBladeSkill extends BossSkill {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'GeometricBlade',
      damage: 30,
      cooldown: 8.0,
      phase: SkillPhase.Phase1,
      priority: 6,
    });
  }
  
  async execute(bossX: number, bossY: number, playerX: number, playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[GeometricBlade] 3把飞刃');
    
    const shapes = ['triangle', 'rectangle', 'diamond'];
    
    for (let i = 0; i < 3; i++) {
      await this.delay(200);
      this.throwBlade(bossX, bossY, playerX, playerY, shapes[i]);
    }
    
    await this.delay(2000);
    this.onComplete();
  }
  
  private throwBlade(startX: number, startY: number, targetX: number, targetY: number, shape: string): void {
    const blade = this.scene.add.graphics();
    blade.setPosition(startX, startY);
    
    // 绘制形状
    blade.fillStyle(0x8b00ff, 1);
    blade.lineStyle(2, 0xff00ff, 1);
    
    switch (shape) {
      case 'triangle':
        blade.fillTriangle(0, -15, 13, 15, -13, 15);
        blade.strokeTriangle(0, -15, 13, 15, -13, 15);
        break;
      case 'rectangle':
        blade.fillRect(-12, -12, 24, 24);
        blade.strokeRect(-12, -12, 24, 24);
        break;
      case 'diamond':
        blade.beginPath();
        blade.moveTo(0, -15);
        blade.lineTo(15, 0);
        blade.lineTo(0, 15);
        blade.lineTo(-15, 0);
        blade.closePath();
        blade.fillPath();
        blade.strokePath();
        break;
    }
    
    const angle = Math.atan2(targetY - startY, targetX - startX);
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    
    // 旋转+移动
    this.scene.tweens.add({
      targets: blade,
      x: targetX,
      y: targetY,
      angle: 720,
      duration: (distance / 200) * 1000,
      onUpdate: () => {
        // 碰撞检测
        const player = this.scene.children.getByName('player') as any;
        if (player) {
          const dist = Phaser.Math.Distance.Between(blade.x, blade.y, player.x, player.y);
          if (dist < 30) {
            if (player.takeDamage) player.takeDamage(this.config.damage);
            
            // 爆炸粒子
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i;
              const particle = this.scene.add.rectangle(blade.x, blade.y, 4, 4, 0x8b00ff);
              this.scene.tweens.add({
                targets: particle,
                x: blade.x + Math.cos(angle) * 40,
                y: blade.y + Math.sin(angle) * 40,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
              });
            }
            
            blade.destroy();
          }
        }
      },
      onComplete: () => {
        this.scene.tweens.add({
          targets: blade,
          alpha: 0,
          duration: 200,
          onComplete: () => blade.destroy()
        });
      }
    });
  }
}
