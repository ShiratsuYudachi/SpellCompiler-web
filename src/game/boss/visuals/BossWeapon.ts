/**
 * BossWeapon - Boss几何体长剑
 */

import Phaser from 'phaser';

export class BossWeapon {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private blade: Phaser.GameObjects.Graphics;
  private trail: Phaser.GameObjects.Graphics[] = [];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.blade = scene.add.graphics();
    this.drawBlade();
    this.container.add(this.blade);
  }
  
  private drawBlade(): void {
    this.blade.clear();
    
    // 三角剑尖
    this.blade.fillStyle(0xaa00ff, 1);
    this.blade.beginPath();
    this.blade.moveTo(0, -40);
    this.blade.lineTo(8, -25);
    this.blade.lineTo(-8, -25);
    this.blade.closePath();
    this.blade.fillPath();
    
    // 菱形剑身
    const gradient = [0x8b00ff, 0x6600cc, 0x8b00ff];
    for (let i = 0; i < 3; i++) {
      this.blade.fillStyle(gradient[i], 1);
      const yOffset = -25 + i * 20;
      this.blade.beginPath();
      this.blade.moveTo(0, yOffset);
      this.blade.lineTo(6, yOffset + 10);
      this.blade.lineTo(0, yOffset + 20);
      this.blade.lineTo(-6, yOffset + 10);
      this.blade.closePath();
      this.blade.fillPath();
    }
    
    // 护手
    this.blade.fillStyle(0xd4af37, 1);
    this.blade.fillRect(-10, 35, 20, 4);
    
    // 剑柄
    this.blade.fillStyle(0x4a0080, 1);
    this.blade.fillRect(-3, 39, 6, 12);
  }
  
  setPosition(x: number, y: number): void {
    this.container.setPosition(x + 25, y);
  }
  
  // 斩击动画
  async slash(angle: number): Promise<void> {
    return new Promise(resolve => {
      // 拖尾
      const trailGraphics = this.scene.add.graphics();
      trailGraphics.lineStyle(4, 0x8b00ff, 0.5);
      this.trail.push(trailGraphics);
      
      this.scene.tweens.add({
        targets: this.container,
        angle: angle,
        duration: 200,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          // 绘制拖尾
          trailGraphics.clear();
          trailGraphics.lineStyle(4, 0x8b00ff, 0.3);
          trailGraphics.arc(
            this.container.x,
            this.container.y,
            60,
            Phaser.Math.DegToRad(this.container.angle - 45),
            Phaser.Math.DegToRad(this.container.angle),
            false
          );
          trailGraphics.strokePath();
        },
        onComplete: () => {
          this.scene.tweens.add({
            targets: trailGraphics,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              trailGraphics.destroy();
              this.trail = this.trail.filter(t => t !== trailGraphics);
            }
          });
          
          this.scene.tweens.add({
            targets: this.container,
            angle: 0,
            duration: 150,
            onComplete: resolve
          });
        }
      });
    });
  }
  
  // 蓄力动画
  charge(duration: number): void {
    this.scene.tweens.add({
      targets: this.container,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: duration / 2,
      yoyo: true,
      repeat: Math.floor(duration / 400) - 1
    });
  }
  
  destroy(): void {
    this.trail.forEach(t => t.destroy());
    this.container.destroy();
  }
  
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
}
