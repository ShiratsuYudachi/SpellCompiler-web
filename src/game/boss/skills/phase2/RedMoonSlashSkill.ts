/**
 * RedMoonSlashSkill - red moon wide slash(text)
 * Bossmove to top center,random half-screen slash
 */

import Phaser from 'phaser';
import { BossSkill, SkillPhase } from '../BossSkill';

export class RedMoonSlashSkill extends BossSkill {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'RedMoonSlash',
      damage: 70,
      cooldown: 14.0,
      phase: SkillPhase.Phase2,
      priority: 9,
    });
  }
  
  async execute(_bossX: number, _bossY: number, _playerX: number, _playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[RedMoonSlash] Red moon slash');
    
    const boss = this.scene.children.getByName('boss-container') as any;
    if (!boss) {
      this.onComplete();
      return;
    }
    
    // Bossmove to top center
    const originalX = boss.x;
    const originalY = boss.y;
    const topCenterX = 480;
    const topCenterY = 100;
    
    this.scene.tweens.add({
      targets: boss,
      x: topCenterX,
      y: topCenterY,
      duration: 500,
      ease: 'Cubic.easeOut'
    });
    
    await this.delay(500);
    
    // text
    const slashTypes = ['left', 'right', 'center', 'top'];
    const selectedSlash = Phaser.Utils.Array.GetRandom(slashTypes);
    
    await this.executeSlash(selectedSlash, topCenterX, topCenterY);
    
    // Bossreturn
    this.scene.tweens.add({
      targets: boss,
      x: originalX,
      y: originalY,
      duration: 400,
      ease: 'Cubic.easeIn'
    });
    
    await this.delay(400);
    this.onComplete();
  }
  
  private async executeSlash(type: string, bossX: number, bossY: number): Promise<void> {
    // charge
    const chargeCircle = this.scene.add.circle(bossX, bossY, 30, 0xff0066, 0.5);
    this.scene.tweens.add({
      targets: chargeCircle,
      scale: 2,
      alpha: 0,
      duration: 800
    });
    
    await this.delay(800);
    chargeCircle.destroy();
    
    // slash
    const slashGraphics = this.scene.add.graphics();
    slashGraphics.lineStyle(12, 0xff0066, 1);
    
    
    switch (type) {
      case 'left':
        // left half
        slashGraphics.arc(bossX, bossY, 400, Math.PI * 0.5, Math.PI * 1.5, false);
        break;
      case 'right':
        // right half
        slashGraphics.arc(bossX, bossY, 400, -Math.PI * 0.5, Math.PI * 0.5, false);
        break;
      case 'center':
        // middle vertical slash
        slashGraphics.lineBetween(bossX, bossY, bossX, 540);
        break;
      case 'top':
        // top half horizontal slash
        slashGraphics.lineBetween(50, bossY, 910, bossY);
        break;
    }
    
    slashGraphics.strokePath();
    
    // text
    const player = this.scene.children.getByName('player') as any;
    if (player && this.checkPlayerInSlashZone(type, bossX, bossY, player.x, player.y)) {
      if (player.takeDamage) player.takeDamage(this.config.damage);
      
      // knockback
      const dx = player.x - bossX;
      const dy = player.y - bossY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        player.x += (dx / dist) * 80;
        player.y += (dy / dist) * 80;
      }
      
      this.scene.cameras.main.shake(300, 0.02);
    }
    
    this.scene.tweens.add({
      targets: slashGraphics,
      alpha: 0,
      duration: 400,
      onComplete: () => slashGraphics.destroy()
    });
    
    await this.delay(400);
  }
  
  private checkPlayerInSlashZone(type: string, bossX: number, bossY: number, playerX: number, playerY: number): boolean {
    const dist = Phaser.Math.Distance.Between(bossX, bossY, playerX, playerY);
    
    switch (type) {
      case 'left':
        return playerX < bossX && dist < 400;
      case 'right':
        return playerX > bossX && dist < 400;
      case 'center':
        return Math.abs(playerX - bossX) < 50 && playerY > bossY;
      case 'top':
        return Math.abs(playerY - bossY) < 40;
      default:
        return false;
    }
  }
}
