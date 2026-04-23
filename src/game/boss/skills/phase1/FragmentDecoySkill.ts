/**
 * FragmentDecoySkill - fragment decoy
 * triggered on hit:BosstextTeleported totext
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

export class FragmentDecoySkill extends BossSkill {
  private effects: BossEffects;
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'FragmentDecoy',
      damage: 0, // text,text
      cooldown: 3.0,
      phase: SkillPhase.Phase1,
      priority: 10, // text,text
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
    
    console.log('[FragmentDecoy] Fragment decoy triggered!');
    
    // create fragment burst effect
    this.createFragmentExplosion(bossX, bossY);
    
    // text
    const teleportPos = this.calculateTeleportPosition(
      bossX,
      bossY,
      playerX,
      playerY
    );
    
    // wait0.3sec
    await this.delay(300);
    
    // Bosstext
    this.emitTeleportEvent(teleportPos.x, teleportPos.y);
    
    // text
    this.effects.createTeleportFlash(teleportPos.x, teleportPos.y, 60);
    
    this.onComplete();
  }
  
  /**
   * create fragment burst effect
   */
  private createFragmentExplosion(x: number, y: number): void {
    // text
    const fragmentCount = 12;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 / fragmentCount) * i;
      const fragment = this.scene.add.graphics();
      
      // text
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
      
      // text
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
    
    // center explosion particles
    this.effects.createParticleBurst(x, y, 0x8b00ff, 20, 150);
  }
  
  /**
   * calculate teleport position(text)
   */
  private calculateTeleportPosition(
    bossX: number,
    bossY: number,
    playerX: number,
    playerY: number
  ): { x: number; y: number } {
    // textBosstext
    const dx = playerX - bossX;
    const dy = playerY - bossY;
    
    // text
    const behindAngle = Math.atan2(dy, dx);
    
    // randomly choose left or right(120text)
    const sideOffset = (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 2 / 3);
    const teleportAngle = behindAngle + sideOffset;
    
    // distance150px
    const teleportDistance = 150;
    const targetX = playerX + Math.cos(teleportAngle) * teleportDistance;
    const targetY = playerY + Math.sin(teleportAngle) * teleportDistance;
    
    // boundary clamp
    return {
      x: Phaser.Math.Clamp(targetX, 50, 910),
      y: Phaser.Math.Clamp(targetY, 50, 490),
    };
  }
  
  /**
   * triggerBosstext
   */
  private emitTeleportEvent(x: number, y: number): void {
    this.scene.events.emit('boss-teleport', { x, y });
  }
  
}
