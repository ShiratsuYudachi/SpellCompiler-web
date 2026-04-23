/**
 * miniontext
 */

import Phaser from 'phaser';

export interface MinionConfig {
  health: number;
  speed: number;
  damage: number;
}

export abstract class BaseMinion extends Phaser.GameObjects.Rectangle {
  protected maxHealth: number;
  protected currentHealth: number;
  protected speed: number;
  protected damage: number;
  protected isDead: boolean = false;
  
  protected player?: Phaser.GameObjects.GameObject;
  
  constructor(scene: Phaser.Scene, x: number, y: number, config: MinionConfig) {
    super(scene, x, y, 30, 30, 0xff0000);
    
    this.maxHealth = config.health;
    this.currentHealth = config.health;
    this.speed = config.speed;
    this.damage = config.damage;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setName('minion');
    
    // text
    this.createHealthBar();
  }
  
  private createHealthBar(): void {
    // implemented by subclass
  }
  
  /**
   * text(called every frame)
   */
  update(delta: number): void {
    if (this.isDead) return;
    
    this.updateBehavior(delta);
  }
  
  /**
   * implemented by subclass
   */
  protected abstract updateBehavior(delta: number): void;
  
  /**
   * take damage
   */
  takeDamage(amount: number): void {
    if (this.isDead) return;
    
    this.currentHealth -= amount;
    this.flashDamage();
    
    if (this.currentHealth <= 0) {
      this.die();
    }
  }
  
  /**
   * text
   */
  private flashDamage(): void {
    const originalFill = this.fillColor;
    this.setFillStyle(0xffffff);
    this.scene.time.delayedCall(100, () => {
      this.setFillStyle(originalFill);
    });
  }
  
  /**
   * Died
   */
  protected die(): void {
    this.isDead = true;
    
    // Diedtext
    this.createDeathEffect();
    
    // notify scene
    this.scene.events.emit('minion-killed', this);
    
    this.destroy();
  }
  
  /**
   * Diedtext
   */
  private createDeathEffect(): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const particle = this.scene.add.rectangle(
        this.x,
        this.y,
        5,
        5,
        this.fillColor
      );
      
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 50,
        y: this.y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }
  }
  
  /**
   * get player ref
   */
  protected getPlayer(): Phaser.GameObjects.GameObject | null {
    if (!this.player) {
      this.player = this.scene.children.getByName('player') || undefined;
    }
    return this.player || null;
  }
  
  /**
   * get direction to player
   */
  protected getDirectionToPlayer(): { dx: number; dy: number; distance: number } | null {
    const player = this.getPlayer() as any;
    if (!player) return null;
    
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return { dx, dy, distance };
  }
  
  /**
   * get damage value
   */
  getDamage(): number {
    return this.damage;
  }
}
