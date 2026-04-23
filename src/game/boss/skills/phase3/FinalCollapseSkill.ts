/**
 * FinalCollapseSkill - final struggle(text)
 * 24text3sec
 */

import Phaser from 'phaser';
import { showDomBanner } from '../../../ui/gameDomUiStore';
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
    console.log('[FinalCollapse] Final struggle!');
    
    // warning
    this.scene.cameras.main.shake(1000, 0.03);
    showDomBanner('!!! LAST STAND !!!', '#ff3333', 56, 1000);
    
    await this.delay(1000);
    
    // Spawned24fragment
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
    
    // tracking3sec
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
          
          // text300px/s
          const speed = 300 * 0.05; // 50msupdate
          if (dist > 0) {
            frag.x += (dx / dist) * speed;
            frag.y += (dy / dist) * speed;
          }
          
          frag.rotation += 0.2;
          
          // trail
          if (Math.random() < 0.3) {
            const trail = this.scene.add.circle(frag.x, frag.y, 3, 0xff0000, 0.5);
            this.scene.tweens.add({
              targets: trail,
              alpha: 0,
              duration: 200,
              onComplete: () => trail.destroy()
            });
          }
          
          // text
          if (dist < 25) {
            if (player.takeDamage) {
              player.takeDamage(this.config.damage);
              console.log('[FinalCollapse] Mutual destruction!');
            }
            
            // explode
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
        
        // 3end after seconds
        if (Date.now() - startTime > 3000) {
          trackLoop.destroy();
          
          // text
          const allDestroyed = this.fragments.every(f => !f.active);
          if (!allDestroyed) {
            showDomBanner('PERFECT DODGE!', '#66ff88', 40, 1500);
          }
          
          // text
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
