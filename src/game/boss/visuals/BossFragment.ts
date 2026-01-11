/**
 * BossFragment - Boss碎片组件
 * 管理单个几何体碎片的创建、动画和销毁
 */

import Phaser from 'phaser';

export enum FragmentShape {
  Triangle = 'triangle',
  Rectangle = 'rectangle',
  Diamond = 'diamond',
  Quadrilateral = 'quadrilateral',
}

export interface FragmentConfig {
  x: number;
  y: number;
  shape: FragmentShape;
  size: number;
  color: number;
  alpha?: number;
  rotation?: number;
}

export class BossFragment {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private shape: FragmentShape;
  private size: number;
  private baseColor: number;
  private currentAlpha: number;
  
  // 动画相关
  private floatTween?: Phaser.Tweens.Tween;
  private rotateTween?: Phaser.Tweens.Tween;
  
  constructor(scene: Phaser.Scene, config: FragmentConfig) {
    this.scene = scene;
    this.shape = config.shape;
    this.size = config.size;
    this.baseColor = config.color;
    this.currentAlpha = config.alpha || 1;
    
    // 创建图形对象
    this.graphics = scene.add.graphics();
    this.graphics.setPosition(config.x, config.y);
    this.graphics.setRotation(config.rotation || 0);
    this.graphics.setAlpha(this.currentAlpha);
    
    this.draw();
  }
  
  private draw(): void {
    this.graphics.clear();
    
    switch (this.shape) {
      case FragmentShape.Triangle:
        this.drawTriangle();
        break;
      case FragmentShape.Rectangle:
        this.drawRectangle();
        break;
      case FragmentShape.Diamond:
        this.drawDiamond();
        break;
      case FragmentShape.Quadrilateral:
        this.drawQuadrilateral();
        break;
    }
  }
  
  private drawTriangle(): void {
    const half = this.size / 2;
    
    // 填充
    this.graphics.fillStyle(this.baseColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -half);
    this.graphics.lineTo(half, half);
    this.graphics.lineTo(-half, half);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    // 描边
    this.graphics.lineStyle(2, 0x8b0000, 0.8);
    this.graphics.strokePath();
  }
  
  private drawRectangle(): void {
    const half = this.size / 2;
    
    // 填充
    this.graphics.fillStyle(this.baseColor, 1);
    this.graphics.fillRect(-half, -half, this.size, this.size);
    
    // 描边
    this.graphics.lineStyle(2, 0x8b0000, 0.8);
    this.graphics.strokeRect(-half, -half, this.size, this.size);
  }
  
  private drawDiamond(): void {
    const half = this.size / 2;
    
    // 填充
    this.graphics.fillStyle(this.baseColor, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(0, -half);
    this.graphics.lineTo(half, 0);
    this.graphics.lineTo(0, half);
    this.graphics.lineTo(-half, 0);
    this.graphics.closePath();
    this.graphics.fillPath();
    
    // 描边
    this.graphics.lineStyle(2, 0x8b0000, 0.8);
    this.graphics.strokePath();
  }

  private drawQuadrilateral(): void {
    const half = this.size / 2;

    // 填充
    this.graphics.fillStyle(this.baseColor, 1);
    this.graphics.fillRect(-half, -half, this.size, this.size);

    // 描边
    this.graphics.lineStyle(2, 0x8b0000, 0.8);
    this.graphics.strokeRect(-half, -half, this.size, this.size);
  }

  /**
   * 开始飘动动画
   */
  startFloating(amplitude: number = 5, duration: number = 2000): void {
    const startY = this.graphics.y;
    
    this.floatTween = this.scene.tweens.add({
      targets: this.graphics,
      y: startY + amplitude,
      duration: duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
  
  /**
   * 开始旋转动画
   */
  startRotating(speed: number = 1): void {
    this.rotateTween = this.scene.tweens.add({
      targets: this.graphics,
      rotation: Math.PI * 2,
      duration: 2000 / speed,
      repeat: -1,
      ease: 'Linear',
    });
  }
  
  /**
   * 爆炸分离效果
   */
  explode(force: number = 100): void {
    const angle = Math.random() * Math.PI * 2;
    const vx = Math.cos(angle) * force;
    const vy = Math.sin(angle) * force;
    
    this.scene.tweens.add({
      targets: this.graphics,
      x: this.graphics.x + vx,
      y: this.graphics.y + vy,
      alpha: 0,
      rotation: this.graphics.rotation + Math.PI * 4,
      duration: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => this.destroy(),
    });
  }
  
  /**
   * 更新颜色
   */
  setColor(color: number): void {
    this.baseColor = color;
    this.draw();
  }
  
  /**
   * 更新透明度
   */
  setAlpha(alpha: number): void {
    this.currentAlpha = alpha;
    this.graphics.setAlpha(alpha);
  }
  
  /**
   * 闪烁效果
   */
  flash(duration: number = 100, toAlpha: number = 0.3): void {
    const originalAlpha = this.currentAlpha;
    
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: toAlpha,
      duration: duration,
      yoyo: true,
      onComplete: () => {
        this.graphics.setAlpha(originalAlpha);
      },
    });
  }
  
  /**
   * 移动到指定位置
   */
  moveTo(x: number, y: number, duration: number = 500): Phaser.Tweens.Tween {
    return this.scene.tweens.add({
      targets: this.graphics,
      x,
      y,
      duration,
      ease: 'Cubic.easeInOut',
    });
  }
  
  /**
   * 获取位置
   */
  getPosition(): { x: number; y: number } {
    return { x: this.graphics.x, y: this.graphics.y };
  }
  
  /**
   * 设置位置
   */
  setPosition(x: number, y: number): void {
    this.graphics.setPosition(x, y);
  }
  
  /**
   * 获取Graphics对象
   */
  getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    if (this.floatTween) {
      this.floatTween.stop();
      this.floatTween = undefined;
    }
    
    if (this.rotateTween) {
      this.rotateTween.stop();
      this.rotateTween = undefined;
    }
    
    this.graphics.destroy();
  }
}
