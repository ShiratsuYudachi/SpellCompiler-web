/**
 * FragmentDecoySkill - 碎片替身
 * 被攻击时触发：Boss碎裂并瞬移到玩家侧后方
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

export class FragmentDecoySkill extends BossSkill {
  private effects: BossEffects;
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'FragmentDecoy',
      damage: 0, // 被动技能，不造成直接伤害
      cooldown: 3.0,
      phase: SkillPhase.Phase1,
      priority: 10, // 高优先级，因为是防御技能
    };
    
    super(scene, config);
    this.effects = new BossEffects(scene);
  }
  
  async execute(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): Promise<void> {
    this.isExecuting = true;
    
    console.log('[FragmentDecoy] 碎片替身触发！');
    
    // 创建碎片爆炸效果
    this.createFragmentExplosion(bossX, bossY);
    
    // 计算玩家侧后方位置
    const teleportPos = this.calculateTeleportPosition(
      bossX,
      bossY,
      playerX,
      playerY
    );
    
    // 等待0.3秒
    await this.delay(300);
    
    // Boss瞬移
    this.emitTeleportEvent(teleportPos.x, teleportPos.y);
    
    // 传送闪光
    this.effects.createTeleportFlash(teleportPos.x, teleportPos.y, 60);
    
    this.onComplete();
  }
  
  /**
   * 创建碎片爆炸效果
   */
  private createFragmentExplosion(x: number, y: number): void {
    // 创建多个碎片向外飞散
    const fragmentCount = 12;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 / fragmentCount) * i;
      const fragment = this.scene.add.graphics();
      
      // 绘制三角形碎片
      fragment.fillStyle(0x2b2b2b, 1);
      fragment.beginPath();
      fragment.moveTo(0, -8);
      fragment.lineTo(6, 4);
      fragment.lineTo(-6, 4);
      fragment.closePath();
      fragment.fillPath();
      
      fragment.lineStyle(1, 0x8b0000, 1);
      fragment.strokePath();
      
      fragment.setPosition(x, y);
      fragment.setRotation(angle);
      
      // 飞散动画
      const distance = 80;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;
      
      this.scene.tweens.add({
        targets: fragment,
        x: targetX,
        y: targetY,
        alpha: 0,
        rotation: angle + Math.PI * 2,
        duration: 300,
        ease: 'Cubic.easeOut',
        onComplete: () => fragment.destroy(),
      });
    }
    
    // 中心爆炸粒子
    this.effects.createParticleBurst(x, y, 0x8b00ff, 20, 150);
  }
  
  /**
   * 计算瞬移位置（玩家侧后方）
   */
  private calculateTeleportPosition(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): { x: number; y: number } {
    // 计算从Boss到玩家的方向
    const dx = playerX - bossX;
    const dy = playerY - bossY;
    
    // 玩家背后的方向
    const behindAngle = Math.atan2(dy, dx);
    
    // 随机选择左侧或右侧（120度角）
    const sideOffset = (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 2 / 3);
    const teleportAngle = behindAngle + sideOffset;
    
    // 距离150px
    const teleportDistance = 150;
    const targetX = playerX + Math.cos(teleportAngle) * teleportDistance;
    const targetY = playerY + Math.sin(teleportAngle) * teleportDistance;
    
    // 边界限制
    return {
      x: Phaser.Math.Clamp(targetX, 50, 910),
      y: Phaser.Math.Clamp(targetY, 50, 490),
    };
  }
  
  /**
   * 触发Boss瞬移事件
   */
  private emitTeleportEvent(x: number, y: number): void {
    this.scene.events.emit('boss-teleport', { x, y });
  }
  
}
