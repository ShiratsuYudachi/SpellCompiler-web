/**
 * LinearCutSkill - linear cut
 * Bosstext,text,1text
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
    
    console.log('[LinearCut] Execute linear cut');
    
    // text
    const dx = playerX - bossX;
    const dy = playerY - bossY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // text120px
    const teleportDistance = 120;
    const teleportX = playerX + (dx / distance) * teleportDistance;
    const teleportY = playerY + (dy / distance) * teleportDistance;
    
    // boundary clamp
    const finalX = Phaser.Math.Clamp(teleportX, 50, 910);
    const finalY = Phaser.Math.Clamp(teleportY, 50, 490);
    
    // text(start position)
    this.effects.createTeleportFlash(bossX, bossY, 60);
    
    // text
    this.effects.createCrackLine(
      bossX,
      bossY,
      finalX,
      finalY,
      () => {
        // damage check on explosion
        this.checkLineCollision(bossX, bossY, finalX, finalY);
      }
    );
    
    // wait0.3seconds laterBosstext
    await this.delay(300);
    
    // BossTeleported totext
    this.emitTeleportEvent(finalX, finalY);
    
    // text(endpoint)
    this.effects.createTeleportFlash(finalX, finalY, 60);
    
    // wait for skill end(1text)
    await this.delay(1000);
    
    this.onComplete();
  }
  
  /**
   * check player on rift path
   */
  private checkLineCollision(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // text
    const distance = this.pointToLineDistance(
      player.x,
      player.y,
      x1,
      y1,
      x2,
      y2
    );
    
    // if distance <5px,deal damage
    if (distance < 5) {
      console.log('[LinearCut] Rift explosion hit player!');
      
      if (typeof player.takeDamage === 'function') {
        player.takeDamage(this.config.damage);
      }
      
      // text
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
   * point-to-segment distance
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
   * triggerBosstext
   */
  private emitTeleportEvent(x: number, y: number): void {
    // textBosstext
    this.scene.events.emit('boss-teleport', { x, y });
  }
  
}
