/**
 * RotatingShieldSkill - rotating shield
 * BossaroundSpawnedtext,deflect bullets
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';

interface Shield {
  graphics: Phaser.GameObjects.Graphics;
  angle: number;
  radius: number;
}

export class RotatingShieldSkill extends BossSkill {
  private shields: Shield[] = [];
  private rotationTween?: Phaser.Tweens.Tween;
  private updateEvent?: Phaser.Time.TimerEvent;
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'RotatingShield',
      damage: 0, // defensive skill
      cooldown: 12.0,
      phase: SkillPhase.Phase1,
      priority: 5,
    };
    
    super(scene, config);
  }
  
  async execute(
    bossX: number,
    bossY: number,
    _playerX: number,
    _playerY: number
  ): Promise<void> {
    this.isExecuting = true;
    
    console.log('[RotatingShield] Rotating shield activated');
    
    // text
    this.cleanup();
    
    // create3text
    this.createShields(bossX, bossY);
    
    // start rotating
    this.startRotation();
    
    // start collision detection
    this.startCollisionDetection();
    
    // 8end after seconds
    await this.delay(8000);
    
    this.cleanup();
    this.onComplete();
  }
  
  /**
   * text
   */
  private createShields(centerX: number, centerY: number): void {
    const shieldCount = 3;
    const radius = 80;
    
    for (let i = 0; i < shieldCount; i++) {
      const angle = (Math.PI * 2 / shieldCount) * i;
      
      // text
      const shield = this.scene.add.graphics();
      shield.fillStyle(0x4a2b8b, 0.8);
      shield.fillRect(-30, -10, 60, 20);
      
      shield.lineStyle(2, 0x8b00ff, 1);
      shield.strokeRect(-30, -10, 60, 20);
      
      // glow effect
      shield.lineStyle(4, 0x8b00ff, 0.3);
      shield.strokeRect(-32, -12, 64, 24);
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      shield.setPosition(x, y);
      shield.setRotation(angle + Math.PI / 2);
      
      this.shields.push({
        graphics: shield,
        angle,
        radius,
      });
    }
  }
  
  /**
   * start spin animation
   */
  private startRotation(): void {
    const rotationSpeed = 90; // degrees/sec
    
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => this.updateShieldPositions(),
      loop: true,
    });
    
    // text
    this.shields.forEach(shield => {
      this.scene.tweens.add({
        targets: shield,
        angle: shield.angle + Math.PI * 2,
        duration: (360 / rotationSpeed) * 1000,
        repeat: -1,
        ease: 'Linear',
        onUpdate: () => this.updateShieldPosition(shield),
      });
    });
  }
  
  /**
   * text
   */
  private updateShieldPosition(shield: Shield): void {
    // getBosstext
    const boss = this.scene.children.getByName('boss-container');
    if (!boss) return;
    
    const bossX = (boss as any).x || 480;
    const bossY = (boss as any).y || 270;
    
    const x = bossX + Math.cos(shield.angle) * shield.radius;
    const y = bossY + Math.sin(shield.angle) * shield.radius;
    
    shield.graphics.setPosition(x, y);
    shield.graphics.setRotation(shield.angle + Math.PI / 2);
  }
  
  /**
   * text
   */
  private updateShieldPositions(): void {
    this.shields.forEach(shield => this.updateShieldPosition(shield));
  }
  
  /**
   * start collision detection
   */
  private startCollisionDetection(): void {
    // text
    this.scene.events.on('update', this.checkBulletCollision, this);
  }
  
  /**
   * text
   */
  private checkBulletCollision(): void {
    // text(textBossBattleTestScene)
    const scene = this.scene as any;
    if (!scene.bullets || !Array.isArray(scene.bullets)) return;
    
    const bullets = scene.bullets;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      
      // text
      for (const shield of this.shields) {
        const distance = Phaser.Math.Distance.Between(
          bullet.x,
          bullet.y,
          shield.graphics.x,
          shield.graphics.y
        );
        
        if (distance < 40) {
          console.log('[RotatingShield] Shield deflected bullet!');
          
          // reflect bullet
          this.reflectBullet(bullet, shield);
          
          // text
          this.flashShield(shield.graphics);
          
          break;
        }
      }
    }
  }
  
  /**
   * reflect bullet
   */
  private reflectBullet(bullet: any, _shield: Shield): void {
    // text(simplified:reverse)
    bullet.vx = -bullet.vx;
    bullet.vy = -bullet.vy;
    
    // text
    const flash = this.scene.add.circle(bullet.x, bullet.y, 15, 0x8b00ff, 0.6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }
  
  /**
   * text
   */
  private flashShield(shield: Phaser.GameObjects.Graphics): void {
    this.scene.tweens.add({
      targets: shield,
      alpha: 1,
      duration: 100,
      yoyo: true,
      onComplete: () => shield.setAlpha(0.8),
    });
  }
  
  /**
   * text
   */
  private cleanup(): void {
    this.shields.forEach(shield => shield.graphics.destroy());
    this.shields = [];
    
    if (this.rotationTween) {
      this.rotationTween.stop();
      this.rotationTween = undefined;
    }
    
    if (this.updateEvent) {
      this.updateEvent.destroy();
      this.updateEvent = undefined;
    }
    
    this.scene.events.off('update', this.checkBulletCollision, this);
  }
  
  /**
   * text
   */
  destroy(): void {
    this.cleanup();
  }
}
