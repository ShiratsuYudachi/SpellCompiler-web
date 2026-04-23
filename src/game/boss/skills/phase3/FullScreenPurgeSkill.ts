/**
 * FullScreenPurgeSkill - text
 * text50text,1.5text,text
 */

import Phaser from 'phaser';
import { clearDomBanner, showDomBanner } from '../../../ui/gameDomUiStore';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

interface ScanLine {
  graphics: Phaser.GameObjects.Graphics;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHorizontal: boolean;
}

interface Intersection {
  x: number;
  y: number;
}

export class FullScreenPurgeSkill extends BossSkill {
  private effects: BossEffects;
  private scanLines: ScanLine[] = [];
  private intersections: Intersection[] = [];
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'FullScreenPurge',
      damage: 80, // text80damage
      cooldown: 25.0, // text,text
      phase: SkillPhase.Phase3,
      priority: 10, // text
    };
    
    super(scene, config);
    this.effects = new BossEffects(scene);
  }
  
  async execute(
    _bossX: number,
    _bossY: number,
    _playerX: number,
    _playerY: number
  ): Promise<void> {
    this.isExecuting = true;
    
    console.log('[FullScreenPurge] Full-screen purge!');
    
    // text
    this.cleanup();
    
    // text
    await this.darkenScreen();
    
    // Spawnedtext
    this.generateScanLines();
    
    // text
    this.calculateIntersections();
    
    // 1.5text
    await this.warningPhase();
    
    // text
    await this.explodeIntersections();
    
    // cleanup
    this.cleanup();
    
    this.onComplete();
  }
  
  /**
   * text
   */
  private async darkenScreen(): Promise<void> {
    const darkOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0
    );
    darkOverlay.setDepth(50);
    darkOverlay.setName('purge-overlay');
    
    this.scene.tweens.add({
      targets: darkOverlay,
      alpha: 0.5,
      duration: 500,
      ease: 'Cubic.easeIn',
    });
    
    await this.delay(500);
  }
  
  /**
   * Spawnedscan lines
   */
  private generateScanLines(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // Spawned25text
    for (let i = 0; i < 25; i++) {
      const y = Math.random() * height;
      const line = this.effects.createScanLine(0, y, width, y);
      line.setDepth(51);
      
      this.scanLines.push({
        graphics: line,
        x1: 0,
        y1: y,
        x2: width,
        y2: y,
        isHorizontal: true,
      });
    }
    
    // Spawned25text
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * width;
      const line = this.effects.createScanLine(x, 0, x, height);
      line.setDepth(51);
      
      this.scanLines.push({
        graphics: line,
        x1: x,
        y1: 0,
        x2: x,
        y2: height,
        isHorizontal: false,
      });
    }
    
    console.log(`[FullScreenPurge] Generated ${this.scanLines.length} scan lines`);
  }
  
  /**
   * text
   */
  private calculateIntersections(): void {
    const horizontalLines = this.scanLines.filter(l => l.isHorizontal);
    const verticalLines = this.scanLines.filter(l => !l.isHorizontal);
    
    // text
    for (const h of horizontalLines) {
      for (const v of verticalLines) {
        this.intersections.push({
          x: v.x1,
          y: h.y1,
        });
      }
    }
    
    // textonetext(textonetext)
    this.createSafeGap();
    
    console.log(`[FullScreenPurge] Calculated ${this.intersections.length} intersections`);
  }
  
  /**
   * text
   */
  private createSafeGap(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // text50pxtext,text
    const safeRadius = 40;
    
    this.intersections = this.intersections.filter(inter => {
      const dx = inter.x - player.x;
      const dy = inter.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > safeRadius;
    });
    
    // text(text)
    const safeZone = this.scene.add.circle(
      player.x,
      player.y,
      safeRadius,
      0x00ff00,
      0.2
    );
    safeZone.setStrokeStyle(2, 0x00ff00, 0.6);
    safeZone.setDepth(52);
    safeZone.setName('safe-zone');
    
    // text
    this.scene.tweens.add({
      targets: safeZone,
      alpha: { from: 0.3, to: 0.1 },
      duration: 300,
      yoyo: true,
      repeat: 4,
    });
  }
  
  /**
   * text
   */
  private async warningPhase(): Promise<void> {
    showDomBanner('!!! FULL PURGE !!!', '#ff4444', 48, 1600);
    
    // text(text)
    this.intersections.forEach(inter => {
      const dot = this.scene.add.circle(inter.x, inter.y, 3, 0xff0000, 0.6);
      dot.setDepth(52);
      dot.setName('intersection-dot');
      
      this.scene.tweens.add({
        targets: dot,
        scale: { from: 1, to: 1.5 },
        alpha: { from: 0.6, to: 0.2 },
        duration: 300,
        yoyo: true,
        repeat: 4,
      });
    });
    
    await this.delay(1500);
    
    clearDomBanner();
  }
  
  /**
   * text
   */
  private async explodeIntersections(): Promise<void> {
    console.log('[FullScreenPurge] Intersections detonated!');
    
    // text
    this.effects.flashScreen(0xff0000, 200);
    
    // text
    this.scene.cameras.main.shake(500, 0.02);
    
    // text
    this.intersections.forEach((inter, index) => {
      // text(text)
      this.scene.time.delayedCall(index * 2, () => {
        // text
        const explosion = this.scene.add.circle(
          inter.x,
          inter.y,
          10,
          0x8b00ff,
          0.8
        );
        explosion.setDepth(53);
        
        this.scene.tweens.add({
          targets: explosion,
          radius: 30,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => explosion.destroy(),
        });
      });
    });
    
    // wait100mstext
    await this.delay(100);
    this.checkPlayerDamage();
    
    await this.delay(400);
  }
  
  /**
   * text
   */
  private checkPlayerDamage(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // text
    let hitCount = 0;
    
    for (const inter of this.intersections) {
      const dx = player.x - inter.x;
      const dy = player.y - inter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // text30px
      if (distance < 30) {
        hitCount++;
      }
    }
    
    if (hitCount > 0) {
      console.log(`[FullScreenPurge] Player hit! Explosion count: ${hitCount}`);
      
      // text
      const totalDamage = this.config.damage * hitCount;
      
      if (typeof player.takeDamage === 'function') {
        player.takeDamage(totalDamage);
      }
      
      // text
      const centerX = this.scene.cameras.main.centerX;
      const centerY = this.scene.cameras.main.centerY;
      const dx = player.x - centerX;
      const dy = player.y - centerY;
      const angle = Math.atan2(dy, dx);
      const knockbackForce = 200;
      
      this.scene.tweens.add({
        targets: player,
        x: player.x + Math.cos(angle) * knockbackForce,
        y: player.y + Math.sin(angle) * knockbackForce,
        duration: 300,
        ease: 'Cubic.easeOut',
      });
    } else {
      console.log('[FullScreenPurge] Player dodged successfully!');
    }
  }
  
  /**
   * cleanup
   */
  private cleanup(): void {
    // text
    this.scanLines.forEach(line => line.graphics.destroy());
    this.scanLines = [];
    
    // text
    this.intersections = [];
    
    // text
    const overlay = this.scene.children.getByName('purge-overlay');
    if (overlay) {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 500,
        onComplete: () => overlay.destroy(),
      });
    }
    
    // text
    const safeZone = this.scene.children.getByName('safe-zone');
    if (safeZone) safeZone.destroy();
    
    // text
    const dots = this.scene.children.getAll().filter(
      (obj: any) => obj.name === 'intersection-dot'
    );
    dots.forEach(dot => dot.destroy());
  }
  
  /**
   * destroy
   */
  destroy(): void {
    this.cleanup();
  }
}
