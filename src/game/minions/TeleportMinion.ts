/**
 * textminion - periodicallyTeleported totext
 */

import Phaser from 'phaser';
import { BaseMinion, MinionConfig } from './BaseMinion';

export class TeleportMinion extends BaseMinion {
  private teleportCooldown: number = 3000; // 3text
  private lastTeleportTime: number = 0;
  private isTeleporting: boolean = false;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, config);
    this.setFillStyle(0x8b00ff); // purple
  }
  
  protected updateBehavior(_delta: number): void {
    if (this.isTeleporting) return;
    
    const direction = this.getDirectionToPlayer();
    if (!direction) return;
    
    const { dx, dy, distance } = direction;
    const now = Date.now();
    
    // text,text
    if (distance > 200 && now - this.lastTeleportTime > this.teleportCooldown) {
      this.performTeleport();
      return;
    }
    
    // text
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
    
    // text
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        // Teleported totext
        const angle = Math.random() * Math.PI * 2;
        const teleportDistance = 80 + Math.random() * 40;
        
        this.x = player.x + Math.cos(angle) * teleportDistance;
        this.y = player.y + Math.sin(angle) * teleportDistance;
        
        // text
        this.scene.tweens.add({
          targets: this,
          alpha: 1,
          duration: 200,
          onComplete: () => {
            this.isTeleporting = false;
          },
        });
        
        // text
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
