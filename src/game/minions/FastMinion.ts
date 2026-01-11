/**
 * 快速冲刺型小怪 - 快速移动，定期冲刺
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class FastMinion extends BaseMinion {
  private dashCooldown: number = 4000; // 4秒冲刺一次
  private lastDashTime: number = 0;
  private isDashing: boolean = false;
  private dashDuration: number = 500;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0xffff00); // 黄色
    
    // 快速型更小
    this.setSize(25, 25);
    
    // 速度更快
    this.speed *= 1.5;
  }
  
  protected updateBehavior(_delta: number): void {
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    const now = Date.now();
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    
    // 冲刺逻辑
    if (!this.isDashing && distance > 150 && distance < 400 && now - this.lastDashTime > this.dashCooldown) {
      this.performDash(dx, dy, distance);
      return;
    }
    
    // 正常追击（速度快）
    if (distance > 50 && !this.isDashing) {
      const moveX = (dx / distance) * this.speed;
      const moveY = (dy / distance) * this.speed;
      body.setVelocity(moveX, moveY);
    } else if (!this.isDashing) {
      body.setVelocity(0, 0);
    }
  }
  
  private performDash(dx: number, dy: number, distance: number): void {
    this.isDashing = true;
    this.lastDashTime = Date.now();
    
    const body = this.body as Phaser.Physics.Arcade.Body;
    const dashSpeed = this.speed * 3;
    
    // 冲刺速度
    body.setVelocity(
      (dx / distance) * dashSpeed,
      (dy / distance) * dashSpeed
    );
    
    // 冲刺特效（拖尾）
    const originalFill = this.fillColor;
    this.setFillStyle(0xffffff);
    const trail = this.scene.add.rectangle(this.x, this.y, 25, 25, 0xffff00, 0.5);
    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      duration: this.dashDuration,
      onComplete: () => trail.destroy(),
    });

    // 冲刺结束
    this.scene.time.delayedCall(this.dashDuration, () => {
      this.isDashing = false;
      this.setFillStyle(originalFill);
      body.setVelocity(0, 0);
    });
  }
}
