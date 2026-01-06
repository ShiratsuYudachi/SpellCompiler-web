/**
 * BossEffects - Boss特效系统
 * 管理各种视觉特效（粒子、闪烁、残影等）
 */

import Phaser from 'phaser';

export class BossEffects {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * 创建粒子爆发效果
   */
  createParticleBurst(
    x: number,
    y: number,
    color: number = 0x8b00ff,
    count: number = 20,
    speed: number = 150
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const particle = this.scene.add.rectangle(x, y, 4, 4, color);
      
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      this.scene.tweens.add({
        targets: particle,
        x: x + vx,
        y: y + vy,
        alpha: 0,
        scale: 0,
        duration: 500,
        ease: 'Cubic.easeOut',
        onComplete: () => particle.destroy(),
      });
    }
  }
  
  /**
   * 创建紫色裂痕线（线状切割技能用）
   */
  createCrackLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    onExplode: () => void
  ): Phaser.GameObjects.Graphics {
    const line = this.scene.add.graphics();
    line.lineStyle(3, 0x8b00ff, 0.6);
    line.lineBetween(x1, y1, x2, y2);
    
    // 闪烁效果
    this.scene.tweens.add({
      targets: line,
      alpha: { from: 0.6, to: 0.2 },
      duration: 200,
      yoyo: true,
      repeat: 4,
    });
    
    // 1秒后爆炸
    this.scene.time.delayedCall(1000, () => {
      onExplode();
      
      // 爆炸粒子
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      this.createParticleBurst(midX, midY, 0x8b00ff, 30, 200);
      
      line.destroy();
    });
    
    return line;
  }
  
  /**
   * 创建残影效果
   */
  createPhantom(
    sourceGraphics: Phaser.GameObjects.Graphics,
    alpha: number = 0.3,
    offsetX: number = -5,
    offsetY: number = 0,
    color: number = 0x8b00ff
  ): Phaser.GameObjects.Graphics {
    const phantom = this.scene.add.graphics();
    phantom.setPosition(
      sourceGraphics.x + offsetX,
      sourceGraphics.y + offsetY
    );
    phantom.setRotation(sourceGraphics.rotation);
    phantom.setAlpha(alpha);
    
    // 复制源图形的路径（简化版，只复制矩形）
    phantom.fillStyle(color, 1);
    phantom.fillRect(-40, -60, 80, 120);
    
    return phantom;
  }
  
  /**
   * 创建传送闪光效果
   */
  createTeleportFlash(x: number, y: number, radius: number = 60): void {
    const flash = this.scene.add.circle(x, y, radius, 0x8b00ff, 0.8);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }
  
  /**
   * 创建冲击波效果
   */
  createShockwave(
    x: number,
    y: number,
    maxRadius: number = 120,
    color: number = 0xff0000,
    duration: number = 500
  ): void {
    const wave = this.scene.add.circle(x, y, 10, 0x000000, 0);
    wave.setStrokeStyle(3, color, 1);
    
    this.scene.tweens.add({
      targets: wave,
      radius: maxRadius,
      alpha: 0,
      duration: duration,
      ease: 'Cubic.easeOut',
      onComplete: () => wave.destroy(),
    });
  }
  
  /**
   * 屏幕闪烁效果
   */
  flashScreen(color: number = 0xffffff, duration: number = 100): void {
    const flash = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      color,
      0.5
    );
    flash.setDepth(1000);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: duration,
      onComplete: () => flash.destroy(),
    });
  }
  
  /**
   * 创建发光线条（刀光）
   */
  createGlowingLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number = 0x00ffff,
    thickness: number = 3,
    glowIntensity: number = 10
  ): Phaser.GameObjects.Graphics {
    const line = this.scene.add.graphics();
    
    // 外层发光
    line.lineStyle(thickness + glowIntensity, color, 0.3);
    line.lineBetween(x1, y1, x2, y2);
    
    // 内层亮线
    line.lineStyle(thickness, color, 1);
    line.lineBetween(x1, y1, x2, y2);
    
    return line;
  }
  
  /**
   * 创建拖尾效果
   */
  createTrail(
    x: number,
    y: number,
    color: number = 0x8b00ff,
    lifetime: number = 300
  ): void {
    const trail = this.scene.add.rectangle(x, y, 8, 8, color, 0.8);
    
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scale: 0.5,
      duration: lifetime,
      ease: 'Cubic.easeOut',
      onComplete: () => trail.destroy(),
    });
  }
  
  /**
   * 创建紫色扫描线（全屏肃清用）
   */
  createScanLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): Phaser.GameObjects.Graphics {
    const line = this.scene.add.graphics();
    line.lineStyle(2, 0x8b00ff, 0.8);
    line.lineBetween(x1, y1, x2, y2);
    
    // 脉动效果
    this.scene.tweens.add({
      targets: line,
      alpha: { from: 0.8, to: 0.3 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });
    
    return line;
  }
  
  /**
   * 创建黑洞效果（空间坍缩用）
   */
  createBlackHole(
    x: number,
    y: number,
    initialSize: number = 200,
    shrinkRate: number = 20,
    duration: number = 6000
  ): { graphics: Phaser.GameObjects.Graphics; destroy: () => void } {
    const blackHole = this.scene.add.graphics();
    blackHole.setDepth(100);
    
    let currentSize = initialSize;
    
    const updateInterval = this.scene.time.addEvent({
      delay: 1000,
      callback: () => {
        currentSize = Math.max(20, currentSize - shrinkRate);
        blackHole.clear();
        
        // 黑色填充
        blackHole.fillStyle(0x000000, 0.9);
        blackHole.fillRect(
          x - currentSize / 2,
          y - currentSize / 2,
          currentSize,
          currentSize
        );
        
        // 紫色描边
        blackHole.lineStyle(3, 0x8b00ff, 1);
        blackHole.strokeRect(
          x - currentSize / 2,
          y - currentSize / 2,
          currentSize,
          currentSize
        );
      },
      loop: true,
    });
    
    // 自动销毁
    this.scene.time.delayedCall(duration, () => {
      updateInterval.destroy();
      blackHole.destroy();
    });
    
    return {
      graphics: blackHole,
      destroy: () => {
        updateInterval.destroy();
        blackHole.destroy();
      },
    };
  }
  
  /**
   * 创建追踪粒子（斗篷追踪用）
   */
  createTrackingParticle(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    speed: number = 150,
    onHit: () => void
  ): Phaser.GameObjects.Graphics {
    const particle = this.scene.add.graphics();
    particle.fillStyle(0x8b00ff, 1);
    particle.fillTriangle(0, -8, 6, 4, -6, 4);
    particle.setPosition(startX, startY);
    
    // 计算角度
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    particle.setRotation(angle + Math.PI / 2);
    
    // 移动到目标
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = (distance / speed) * 1000;
    
    this.scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        onHit();
        this.createParticleBurst(targetX, targetY, 0x8b00ff, 10, 100);
        particle.destroy();
      },
    });
    
    return particle;
  }
  
  /**
   * 创建爆炸效果
   */
  createExplosion(
    x: number,
    y: number,
    radius: number = 100,
    color: number = 0x8b00ff
  ): void {
    // 中心闪光
    const flash = this.scene.add.circle(x, y, radius * 0.5, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => flash.destroy(),
    });
    
    // 冲击波
    const shockwave = this.scene.add.circle(x, y, 10, color, 0);
    shockwave.setStrokeStyle(4, color, 1);
    this.scene.tweens.add({
      targets: shockwave,
      radius: radius,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => shockwave.destroy(),
    });
    
    // 粒子爆发
    this.createParticleBurst(x, y, color, 40, 200);
    
    // 屏幕震动
    this.scene.cameras.main.shake(300, 0.015);
  }
}

