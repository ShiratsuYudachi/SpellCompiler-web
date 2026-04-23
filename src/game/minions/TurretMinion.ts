/**
 * textminion - does not move,text
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class TurretMinion extends BaseMinion {
  private shootCooldown: number = 2000; // 2text
  private lastShootTime: number = 0;
  private shootRange: number = 400; // range
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0x00aaff); // blue
    
    // text
    this.setSize(40, 40);
  }
  
  protected updateBehavior(_delta: number): void {
    // text
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    const now = Date.now();
    
    // text,text
    if (distance <= this.shootRange && now - this.lastShootTime > this.shootCooldown) {
      this.shootBullet(dx, dy, distance);
      this.lastShootTime = now;
    }
  }
  
  private shootBullet(dx: number, dy: number, distance: number): void {
    // text
    const bullet = this.scene.add.rectangle(this.x, this.y, 8, 8, 0xffaa00);
    this.scene.physics.add.existing(bullet);
    
    bullet.setName('enemy-bullet');
    
    const body = bullet.body as Phaser.Physics.Arcade.Body;
    const bulletSpeed = 300;
    body.setVelocity(
      (dx / distance) * bulletSpeed,
      (dy / distance) * bulletSpeed
    );
    
    // 2text
    this.scene.time.delayedCall(2000, () => {
      if (bullet.active) bullet.destroy();
    });
    
    // text
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
