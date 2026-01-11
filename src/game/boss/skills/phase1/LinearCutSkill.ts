/**
 * LinearCutSkill - 线状切割
 * Boss瞬移穿过玩家，留下紫色裂痕，1秒后爆炸
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

export class LinearCutSkill extends BossSkill {
  private effects: BossEffects;
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'LinearCut',
      damage: 40,
      cooldown: 4.0,
      phase: SkillPhase.Phase1,
      priority: 7,
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
    
    console.log('[LinearCut] 执行线状切割');
    
    // 计算玩家后方位置
    const dx = playerX - bossX;
    const dy = playerY - bossY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 玩家后方120px
    const teleportDistance = 120;
    const teleportX = playerX + (dx / distance) * teleportDistance;
    const teleportY = playerY + (dy / distance) * teleportDistance;
    
    // 边界限制
    const finalX = Phaser.Math.Clamp(teleportX, 50, 910);
    const finalY = Phaser.Math.Clamp(teleportY, 50, 490);
    
    // 传送闪光（起始位置）
    this.effects.createTeleportFlash(bossX, bossY, 60);
    
    // 创建紫色裂痕路径
    this.effects.createCrackLine(
      bossX,
      bossY,
      finalX,
      finalY,
      () => {
        // 爆炸时的伤害检测
        this.checkLineCollision(bossX, bossY, finalX, finalY);
      }
    );
    
    // 等待0.3秒后Boss瞬移
    await this.delay(300);
    
    // Boss瞬移到终点
    this.emitTeleportEvent(finalX, finalY);
    
    // 传送闪光（终点位置）
    this.effects.createTeleportFlash(finalX, finalY, 60);
    
    // 等待技能完成（1秒后爆炸）
    await this.delay(1000);
    
    this.onComplete();
  }
  
  /**
   * 检测玩家是否在裂痕路径上
   */
  private checkLineCollision(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // 计算玩家到线段的距离
    const distance = this.pointToLineDistance(
      player.x,
      player.y,
      x1,
      y1,
      x2,
      y2
    );
    
    // 如果距离小于5px，造成伤害
    if (distance < 5) {
      console.log('[LinearCut] 裂痕爆炸命中玩家！');
      
      if (typeof player.takeDamage === 'function') {
        player.takeDamage(this.config.damage);
      }
      
      // 击退效果
      const dx = player.x - (x1 + x2) / 2;
      const dy = player.y - (y1 + y2) / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const knockbackForce = 200;
        const knockbackX = (dx / dist) * knockbackForce;
        const knockbackY = (dy / dist) * knockbackForce;
        
        this.scene.tweens.add({
          targets: player,
          x: player.x + knockbackX * 0.3,
          y: player.y + knockbackY * 0.3,
          duration: 200,
          ease: 'Cubic.easeOut',
        });
      }
    }
  }
  
  /**
   * 计算点到线段的距离
   */
  private pointToLineDistance(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * 触发Boss瞬移事件
   */
  private emitTeleportEvent(x: number, y: number): void {
    // 通过场景事件通知Boss瞬移
    this.scene.events.emit('boss-teleport', { x, y });
  }
  
}
