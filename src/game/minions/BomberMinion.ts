/**
 * 自爆兵 - 快速冲向玩家并自爆
 */

import Phaser from 'phaser';
import { Minion } from './Minion';

export class BomberMinion extends Minion {
  private speed: number;
  private explosionRadius: number = 80;
  private isExploding: boolean = false;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number,
    damage: number,
    speed: number
  ) {
    super(scene, x, y, health, damage, 0xe74c3c); // 橙红色
    this.speed = speed;
  }
  
  update(delta: number, playerX: number, playerY: number): void {
    if (this.isDead || this.isExploding) return;
    
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 接近玩家时自爆
    if (distance < 50) {
      this.explode(playerX, playerY);
      return;
    }
    
    // 快速移动
    const moveX = (dx / distance) * this.speed * (delta / 1000);
    const moveY = (dy / distance) * this.speed * (delta / 1000);
    
    this.sprite.x += moveX;
    this.sprite.y += moveY;
    
    // 闪烁警告（接近时）
    if (distance < 100) {
      this.sprite.setAlpha(0.5 + Math.sin(Date.now() / 100) * 0.5);
    }
  }
  
  private explode(playerX: number, playerY: number): void {
    this.isExploding = true;
    
    // 爆炸特效
    const explosion = this.scene.add.circle(
      this.sprite.x,
      this.sprite.y,
      10,
      0xff6600,
      0.8
    );
    
    this.scene.tweens.add({
      targets: explosion,
      radius: this.explosionRadius,
      alpha: 0,
      duration: 400,
      onComplete: () => explosion.destroy(),
    });
    
    // 检测玩家是否在爆炸范围内
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.explosionRadius) {
      // 通过事件通知场景（玩家受伤）
      this.scene.events.emit('bomber-hit-player', this.damage);
    }
    
    this.die();
  }
  
  protected die(): void {
    // 如果被击杀（非自爆），也会爆炸
    if (!this.isExploding) {
      const player = this.scene.children.getByName('player') as any;
      if (player) {
        this.explode(player.x, player.y);
        return;
      }
    }
    
    super.die();
  }
}
