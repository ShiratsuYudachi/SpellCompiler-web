/**
 * 静止炮台小怪 - 不移动，定期向玩家发射子弹
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class TurretMinion extends BaseMinion {
  private shootCooldown: number = 2000; // 2秒发射一次
  private lastShootTime: number = 0;
  private shootRange: number = 400; // 射程
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0x00aaff); // 蓝色
    
    // 炮台更大
    this.setSize(40, 40);
  }
  
  protected updateBehavior(_delta: number): void {
    // 炮台不移动
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    const now = Date.now();
    
    // 在射程内且冷却好了，发射子弹
    if (distance <= this.shootRange && now - this.lastShootTime > this.shootCooldown) {
      this.shootBullet(dx, dy, distance);
      this.lastShootTime = now;
    }
  }
  
  private shootBullet(dx: number, dy: number, distance: number): void {
    // 创建子弹
    const bullet = this.scene.add.rectangle(this.x, this.y, 8, 8, 0xffaa00);
    this.scene.physics.add.existing(bullet);
    
    bullet.setName('enemy-bullet');
    
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    const bulletSpeed = 300;
    body.setVelocity(
      (dx / distance) * bulletSpeed,
      (dy / distance) * bulletSpeed
    );
    
    // 2秒后自动销毁
    this.scene.time.delayedCall(2000, () => {
      if (bullet.active) bullet.destroy();
    });
    
    // 发射闪光
    const flash = this.scene.add.circle(this.x, this.y, 20, 0xffaa00, 0.6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }
}
