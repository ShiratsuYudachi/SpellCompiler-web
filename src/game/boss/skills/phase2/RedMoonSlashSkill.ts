/**
 * RedMoonSlashSkill - 红月大横斩（重做）
 * Boss移到屏幕上方中心，随机挥砍半屏
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
    console.log('[RedMoonSlash] 红月挥砍');
    
    const boss = this.scene.children.getByName('boss-container') as any;
    if (!boss) {
      this.onComplete();
      return;
    }
    
    // Boss移到屏幕上方中心
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
    
    // 随机选择挥砍区域
    const slashTypes = ['left', 'right', 'center', 'top'];
    const selectedSlash = Phaser.Utils.Array.GetRandom(slashTypes);
    
    await this.executeSlash(selectedSlash, topCenterX, topCenterY);
    
    // Boss返回
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
    // 蓄力
    const chargeCircle = this.scene.add.circle(bossX, bossY, 30, 0xff0066, 0.5);
    this.scene.tweens.add({
      targets: chargeCircle,
      scale: 2,
      alpha: 0,
      duration: 800
    });
    
    await this.delay(800);
    chargeCircle.destroy();
    
    // 挥砍
    const slashGraphics = this.scene.add.graphics();
    slashGraphics.lineStyle(12, 0xff0066, 1);
    
    
    switch (type) {
      case 'left':
        // 左半屏
        slashGraphics.arc(bossX, bossY, 400, Math.PI * 0.5, Math.PI * 1.5, false);
        break;
      case 'right':
        // 右半屏
        slashGraphics.arc(bossX, bossY, 400, -Math.PI * 0.5, Math.PI * 0.5, false);
        break;
      case 'center':
        // 中间竖斩
        slashGraphics.lineBetween(bossX, bossY, bossX, 540);
        break;
      case 'top':
        // 上半屏横斩
        slashGraphics.lineBetween(50, bossY, 910, bossY);
        break;
    }
    
    slashGraphics.strokePath();
    
    // 检测伤害
    const player = this.scene.children.getByName('player') as any;
    if (player && this.checkPlayerInSlashZone(type, bossX, bossY, player.x, player.y)) {
      this.damagePlayer(this.config.damage);

      // 击退
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
