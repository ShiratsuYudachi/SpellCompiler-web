/**
 * 小怪基类
 */

import Phaser from 'phaser';

export abstract class Minion {
  protected scene: Phaser.Scene;
  protected sprite: Phaser.GameObjects.Rectangle;
  protected health: number;
  protected maxHealth: number;
  protected damage: number;
  protected isDead: boolean = false;
  
  protected healthBar?: Phaser.GameObjects.Graphics;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number,
    damage: number,
    color: number = 0xff0000
  ) {
    this.scene = scene;
    this.health = health;
    this.maxHealth = health;
    this.damage = damage;
    
    // 创建精灵（矩形占位符）
    this.sprite = scene.add.rectangle(x, y, 30, 30, color);
    this.sprite.setName('minion');
    
    // 创建血条
    this.createHealthBar();
  }
  
  private createHealthBar(): void {
    this.healthBar = this.scene.add.graphics();
    this.updateHealthBar();
  }
  
  private updateHealthBar(): void {
    if (!this.healthBar) return;
    
    this.healthBar.clear();
    
    const barWidth = 40;
    const barHeight = 4;
    const x = this.sprite.x - barWidth / 2;
    const y = this.sprite.y - 25;
    
    // 背景
    this.healthBar.fillStyle(0x000000, 0.5);
    this.healthBar.fillRect(x, y, barWidth, barHeight);
    
    // 血量
    const healthPercent = this.health / this.maxHealth;
    const currentWidth = barWidth * healthPercent;
    
    const color = healthPercent > 0.5 ? 0x00ff00 : (healthPercent > 0.25 ? 0xffff00 : 0xff0000);
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(x, y, currentWidth, barHeight);
  }
  
  takeDamage(amount: number): void {
    if (this.isDead) return;
    
    this.health -= amount;
    this.updateHealthBar();
    
    // 受击闪烁
    this.sprite.setAlpha(0.5);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite && this.sprite.active) {
        this.sprite.setAlpha(1);
      }
    });
    
    if (this.health <= 0) {
      this.die();
    }
  }
  
  protected die(): void {
    this.isDead = true;
    
    // 死亡特效
    const particles = this.scene.add.particles(this.sprite.x, this.sprite.y, 'particle', {
      speed: { min: 50, max: 150 },
      scale: { start: 1, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 500,
      quantity: 10,
    });
    
    this.scene.time.delayedCall(500, () => particles.destroy());
    
    this.destroy();
  }
  
  destroy(): void {
    if (this.sprite) this.sprite.destroy();
    if (this.healthBar) this.healthBar.destroy();
  }
  
  abstract update(delta: number, playerX: number, playerY: number): void;
  
  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }
  
  getDamage(): number {
    return this.damage;
  }
  
  getSprite(): Phaser.GameObjects.Rectangle {
    return this.sprite;
  }
  
  checkCollisionWithPlayer(playerX: number, playerY: number, playerRadius: number = 20): boolean {
    const dx = this.sprite.x - playerX;
    const dy = this.sprite.y - playerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (15 + playerRadius);
  }
}
