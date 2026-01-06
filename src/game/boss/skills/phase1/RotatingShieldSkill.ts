/**
 * RotatingShieldSkill - 旋转护盾
 * Boss周围生成旋转的矩形护盾，弹开子弹
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
      damage: 0, // 防御技能
      cooldown: 12.0,
      phase: SkillPhase.Phase1,
      priority: 5,
    };
    
    super(scene, config);
  }
  
  async execute(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void> {
    this.isExecuting = true;
    
    console.log('[RotatingShield] 激活旋转护盾');
    
    // 清理之前的护盾
    this.cleanup();
    
    // 创建3个护盾
    this.createShields(bossX, bossY);
    
    // 开始旋转
    this.startRotation();
    
    // 开始碰撞检测
    this.startCollisionDetection();
    
    // 8秒后结束
    await this.delay(8000);
    
    this.cleanup();
    this.onComplete();
  }
  
  /**
   * 创建护盾
   */
  private createShields(centerX: number, centerY: number): void {
    const shieldCount = 3;
    const radius = 80;
    
    for (let i = 0; i < shieldCount; i++) {
      const angle = (Math.PI * 2 / shieldCount) * i;
      
      // 创建矩形护盾
      const shield = this.scene.add.graphics();
      shield.fillStyle(0x4a2b8b, 0.8);
      shield.fillRect(-30, -10, 60, 20);
      
      shield.lineStyle(2, 0x8b00ff, 1);
      shield.strokeRect(-30, -10, 60, 20);
      
      // 发光效果
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
   * 开始旋转动画
   */
  private startRotation(): void {
    const rotationSpeed = 90; // 度/秒
    
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => this.updateShieldPositions(),
      loop: true,
    });
    
    // 每个护盾的旋转动画
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
   * 更新单个护盾位置
   */
  private updateShieldPosition(shield: Shield): void {
    // 获取Boss当前位置
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
   * 更新所有护盾位置
   */
  private updateShieldPositions(): void {
    this.shields.forEach(shield => this.updateShieldPosition(shield));
  }
  
  /**
   * 开始碰撞检测
   */
  private startCollisionDetection(): void {
    // 每帧检测子弹碰撞
    this.scene.events.on('update', this.checkBulletCollision, this);
  }
  
  /**
   * 检测子弹碰撞
   */
  private checkBulletCollision(): void {
    // 获取场景中的子弹（从BossBattleTestScene）
    const scene = this.scene as any;
    if (!scene.bullets || !Array.isArray(scene.bullets)) return;
    
    const bullets = scene.bullets;
    
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      
      // 检测子弹是否与任意护盾碰撞
      for (const shield of this.shields) {
        const distance = Phaser.Math.Distance.Between(
          bullet.x,
          bullet.y,
          shield.graphics.x,
          shield.graphics.y
        );
        
        if (distance < 40) {
          console.log('[RotatingShield] 护盾弹开子弹！');
          
          // 反弹子弹
          this.reflectBullet(bullet, shield);
          
          // 护盾闪光
          this.flashShield(shield.graphics);
          
          break;
        }
      }
    }
  }
  
  /**
   * 反弹子弹
   */
  private reflectBullet(bullet: any, shield: Shield): void {
    // 计算反弹方向（简化版：反向）
    bullet.vx = -bullet.vx;
    bullet.vy = -bullet.vy;
    
    // 反弹特效
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
   * 护盾闪光
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
   * 清理护盾
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
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, () => resolve());
    });
  }
  
  /**
   * 销毁技能
   */
  destroy(): void {
    this.cleanup();
  }
}
