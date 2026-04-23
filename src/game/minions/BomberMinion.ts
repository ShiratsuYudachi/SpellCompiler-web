/**
 * bomber minion - text
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
    super(scene, x, y, health, damage, 0xe74c3c); // orange-red
    this.speed = speed;
  }
  
  update(delta: number, playerX: number, playerY: number): void {
    if (this.isDead || this.isExploding) return;
    
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // text
    if (distance < 50) {
      this.explode(playerX, playerY);
      return;
    }
    
    // fast move
    const moveX = (dx / distance) * this.speed * (delta / 1000);
    const moveY = (dy / distance) * this.speed * (delta / 1000);
    
    this.sprite.x += moveX;
    this.sprite.y += moveY;
    
    // text(text)
    if (distance < 100) {
      this.sprite.setAlpha(0.5 + Math.sin(Date.now() / 100) * 0.5);
    }
  }
  
  private explode(playerX: number, playerY: number): void {
    this.isExploding = true;
    
    // text
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
    
    // text
    const dx = playerX - this.sprite.x;
    const dy = playerY - this.sprite.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < this.explosionRadius) {
      // notify scene via event(text)
      this.scene.events.emit('bomber-hit-player', this.damage);
    }
    
    this.die();
  }
  
  protected die(): void {
    // text(notself-destruct),text
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
