/**
 * 瞬移近战小怪 - 定期瞬移到玩家附近
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class TeleportMinion extends BaseMinion {
  private teleportCooldown: number = 3000; // 3秒瞬移一次
  private lastTeleportTime: number = 0;
  private isTeleporting: boolean = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0x8b00ff); // 紫色
  }
  
  protected updateBehavior(_delta: number): void {
    if (this.isTeleporting) return;
    
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    const now = Date.now();
    
    // 如果距离远且冷却好了，瞬移
    if (distance > 200 && now - this.lastTeleportTime > this.teleportCooldown) {
      this.performTeleport();
      return;
    }
    
    // 否则正常追击
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
  
  private performTeleport(): void {
    const player = this.getPlayer() as any;
    if (!player) return;
    
    this.isTeleporting = true;
    this.lastTeleportTime = Date.now();
    
    // 瞬移前特效
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // 瞬移到玩家附近随机位置
        const angle = Math.random() * Math.PI * 2;
        const teleportDistance = 80 + Math.random() * 40;
        
        this.x = player.x + Math.cos(angle) * teleportDistance;
        this.y = player.y + Math.sin(angle) * teleportDistance;
        
        // 瞬移后特效
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: 200,
          onComplete: () => {
            this.isTeleporting = false;
          },
        });
        
        // 紫色闪光
        const flash = this.scene.add.circle(this.x, this.y, 40, 0x8b00ff, 0.6);
        this.scene.tweens.add({
          targets: flash,
          alpha: 0,
          scale: 2,
          duration: 300,
          onComplete: () => flash.destroy(),
        });
      },
    });
  }
}
