/**
 * 基础追击型小怪
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class BasicMinion extends BaseMinion {
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0xff6666); // 浅红色
  }
  
  protected updateBehavior(_delta: number): void {
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    
    // 简单追击
    if (distance > 50) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      const moveX = (dx / distance) * this.speed;
      const moveY = (dy / distance) * this.speed;
      
      body.setVelocity(moveX, moveY);
    } else {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
    }
  }
}
