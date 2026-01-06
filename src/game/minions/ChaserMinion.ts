/**
 * 追击型小怪 - 持续追击玩家
 */

import Phaser from 'phaser';
import { Minion } from './Minion';

export class ChaserMinion extends Minion {
  private speed: number;
  
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    health: number,
    damage: number,
    speed: number
  ) {
    super(scene, x, y, health, damage, 0xff6b6b); // 红色
    this.speed = speed;
  }
  
  update(delta: number, playerX: number, playerY: number): void {
    if (this.isDead) return;
    
    // 计算方向
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 30) {
      // 移动
      const moveX = (dx / distance) * this.speed * (delta / 1000);
      const moveY = (dy / distance) * this.speed * (delta / 1000);
      
      this.sprite.x += moveX;
      this.sprite.y += moveY;
    }
  }
}
