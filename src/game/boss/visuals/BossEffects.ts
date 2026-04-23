/**
 * BossEffects - Bosseffects system
 * text(particles,flash,text)
 */

import Phaser from 'phaser';

export class BossEffects {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * text
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
   * text(for linear cut skill)
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
    
    // text
    this.scene.tweens.add({
      targets: line,
      alpha: { from: 0.6, to: 0.2 },
      duration: 200,
      yoyo: true,
      repeat: 4,
    });
    
    // 1text
    this.scene.time.delayedCall(1000, () => {
      onExplode();
      
      // text
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      this.createParticleBurst(midX, midY, 0x8b00ff, 30, 200);
      
      line.destroy();
    });
    
    return line;
  }
  
  /**
   * text
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
    
    // copy source shape path(simplified,rectangles only)
    phantom.fillStyle(color, 1);
    phantom.fillRect(-40, -60, 80, 120);
    
    return phantom;
  }
  
  /**
   * text
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
   * text
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
   * screen flash effect
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
   * text(blade glow)
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
    
    // outer glow
    line.lineStyle(thickness + glowIntensity, color, 0.3);
    line.lineBetween(x1, y1, x2, y2);
    
    // inner bright line
    line.lineStyle(thickness, color, 1);
    line.lineBetween(x1, y1, x2, y2);
    
    return line;
  }
  
  /**
   * text
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
   * text(text)
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
    
    // text
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
   * text(for space collapse)
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
        
        // black fill
        blackHole.fillStyle(0x000000, 0.9);
        blackHole.fillRect(
          x - currentSize / 2,
          y - currentSize / 2,
          currentSize,
          currentSize
        );
        
        // purple stroke
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
    
    // auto destroy
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
   * text(for cloak tracking)
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
    
    // calculate angle
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);
    particle.setRotation(angle + Math.PI / 2);
    
    // move to target
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
   * text
   */
  createExplosion(
    x: number,
    y: number,
    radius: number = 100,
    color: number = 0x8b00ff
  ): void {
    // center flash
    const flash = this.scene.add.circle(x, y, radius * 0.5, 0xffffff, 0.8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // text
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

    // text
    this.createParticleBurst(x, y, color, 40, 200);

    // screen shake
    this.scene.cameras.main.shake(300, 0.015);
  }

  /**
   * text
   */
  createImpactFlash(
    x: number,
    y: number,
    color: number = 0xffffff,
    radius: number = 30
  ): void {
    // create flash circle
    const flash = this.scene.add.circle(x, y, radius, color, 0.9);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });

    // add some particle effects
    this.createParticleBurst(x, y, color, 8, 80);
  }
}

