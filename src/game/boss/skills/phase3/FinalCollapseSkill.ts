/**
 * FinalCollapseSkill - 垂死挣扎（修复版）
 * 24碎片追踪玩家3秒
 */

import Phaser from 'phaser';
import { BossSkill, SkillPhase } from '../BossSkill';

export class FinalCollapseSkill extends BossSkill {
  private fragments: Phaser.GameObjects.Graphics[] = [];
  
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'FinalCollapse',
      damage: 999,
      cooldown: 0,
      phase: SkillPhase.Phase3,
      priority: 11,
    });
  }
  
  async execute(_bossX: number, _bossY: number, _playerX: number, _playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[FinalCollapse] 垂死挣扎！');
    
    // 警告
    this.scene.cameras.main.shake(1000, 0.03);
    const warning = this.scene.add.text(480, 200, '!!! 垂死挣扎 !!!', {
      fontSize: '64px',
      color: '#ff0000',
      stroke: '#000000',
      strokeThickness: 8
    });
    warning.setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: warning,
      alpha: 0,
      scale: 1.5,
      duration: 1000,
      onComplete: () => warning.destroy()
    });
    
    await this.delay(1000);
    
    // 生成24碎片
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i;
      const fragment = this.scene.add.graphics();
      fragment.fillStyle(0xff0000, 1);
      fragment.fillTriangle(0, -8, 6, 4, -6, 4);
      fragment.setPosition(
        _bossX + Math.cos(angle) * 80,
        _bossY + Math.sin(angle) * 80
      );
      this.fragments.push(fragment);
    }
    
    // 追踪3秒
    const startTime = Date.now();
    const trackLoop = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        const player = this.scene.children.getByName('player') as any;
        if (!player) return;
        
        this.fragments.forEach(frag => {
          if (!frag.active) return;
          
          const dx = player.x - frag.x;
          const dy = player.y - frag.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // 追踪速度300px/s
          const speed = 300 * 0.05; // 50ms更新
          if (dist > 0) {
            frag.x += (dx / dist) * speed;
            frag.y += (dy / dist) * speed;
          }
          
          frag.rotation += 0.2;
          
          // 拖尾
          if (Math.random() < 0.3) {
            const trail = this.scene.add.circle(frag.x, frag.y, 3, 0xff0000, 0.5);
            this.scene.tweens.add({
              targets: trail,
              alpha: 0,
              duration: 200,
              onComplete: () => trail.destroy()
            });
          }
          
          // 碰撞检测
          if (dist < 25) {
            this.damagePlayer(this.config.damage);
            console.log('[FinalCollapse] 同归于尽！');

            // 爆炸
            for (let i = 0; i < 8; i++) {
              const angle = (Math.PI * 2 / 8) * i;
              const particle = this.scene.add.circle(frag.x, frag.y, 4, 0xff0000);
              this.scene.tweens.add({
                targets: particle,
                x: frag.x + Math.cos(angle) * 40,
                y: frag.y + Math.sin(angle) * 40,
                alpha: 0,
                duration: 300,
                onComplete: () => particle.destroy()
              });
            }
            
            frag.destroy();
          }
        });
        
        // 3秒后结束
        if (Date.now() - startTime > 3000) {
          trackLoop.destroy();
          
          // 完美闪避
          const allDestroyed = this.fragments.every(f => !f.active);
          if (!allDestroyed) {
            const dodgeText = this.scene.add.text(480, 270, '完美闪避！', {
              fontSize: '48px',
              color: '#00ff00',
              stroke: '#000000',
              strokeThickness: 6
            });
            dodgeText.setOrigin(0.5);
            
            this.scene.tweens.add({
              targets: dodgeText,
              alpha: 0,
              y: 220,
              duration: 1500,
              onComplete: () => dodgeText.destroy()
            });
          }
          
          // 清理剩余碎片
          this.fragments.forEach(f => {
            if (f.active) {
              this.scene.tweens.add({
                targets: f,
                alpha: 0,
                duration: 300,
                onComplete: () => f.destroy()
              });
            }
          });
        }
      },
      loop: true
    });
    
    await this.delay(3500);
    trackLoop.destroy();
    
    this.onComplete();
  }
}
