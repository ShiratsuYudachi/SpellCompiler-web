/**
 * CloakTrackingSkill - cloak tracking
 * Bosstext12text,independently track player
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

interface TrackingFragment {
  graphics: Phaser.GameObjects.Graphics;
  speed: number;
  hasHit: boolean;
}

export class CloakTrackingSkill extends BossSkill {
  private effects: BossEffects;
  private fragments: TrackingFragment[] = [];
  private updateEvent?: Phaser.Time.TimerEvent;
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'CloakTracking',
      damage: 10, // each fragment10damage
      cooldown: 10.0,
      phase: SkillPhase.Phase2,
      priority: 7,
    };
    
    super(scene, config);
    this.effects = new BossEffects(scene);
  }
  
  async execute(
    bossX: number,
    bossY: number,
    _playerX: number,
    _playerY: number
  ): Promise<void> {
    this.isExecuting = true;
    
    console.log('[CloakTracking] Cloak tracking activated!');
    
    // text
    this.cleanup();
    
    // create12text
    this.createTrackingFragments(bossX, bossY);
    
    // text
    this.startTracking();
    
    // duration5seconds or until all fragments disappear
    await this.delay(5000);
    
    this.cleanup();
    this.onComplete();
  }
  
  /**
   * text
   */
  private createTrackingFragments(centerX: number, centerY: number): void {
    const fragmentCount = 12;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 / fragmentCount) * i;
      const startRadius = 60;
      
      // text
      const fragment = this.scene.add.graphics();
      fragment.fillStyle(0x8b00ff, 1);
      fragment.beginPath();
      fragment.moveTo(0, -8);
      fragment.lineTo(6, 4);
      fragment.lineTo(-6, 4);
      fragment.closePath();
      fragment.fillPath();
      
      fragment.lineStyle(2, 0xff00ff, 1);
      fragment.strokePath();
      
      const x = centerX + Math.cos(angle) * startRadius;
      const y = centerY + Math.sin(angle) * startRadius;
      fragment.setPosition(x, y);
      fragment.setRotation(angle + Math.PI / 2);
      
      // text
      const speed = 120 + Math.random() * 30;
      
      this.fragments.push({
        graphics: fragment,
        speed,
        hasHit: false,
      });
      
      // start trail effect
      this.startTrailEffect(fragment);
    }
  }
  
  /**
   * start trail effect
   */
  private startTrailEffect(fragment: Phaser.GameObjects.Graphics): void {
    this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (!fragment.active) return;
        this.effects.createTrail(fragment.x, fragment.y, 0x8b00ff, 300);
      },
      loop: true,
    });
  }
  
  /**
   * start tracking
   */
  private startTracking(): void {
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => this.updateFragments(),
      loop: true,
    });
  }
  
  /**
   * update fragment positions
   */
  private updateFragments(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    const delta = this.scene.game.loop.delta / 1000;
    
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const fragment = this.fragments[i];
      
      if (fragment.hasHit) continue;
      
      // calculate direction to player
      const dx = player.x - fragment.graphics.x;
      const dy = player.y - fragment.graphics.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // move fragment
      const moveX = (dx / distance) * fragment.speed * delta;
      const moveY = (dy / distance) * fragment.speed * delta;
      
      fragment.graphics.x += moveX;
      fragment.graphics.y += moveY;
      
      // rotate toward player
      const angle = Math.atan2(dy, dx);
      fragment.graphics.setRotation(angle + Math.PI / 2);
      
      // collision check
      if (distance < 20) {
        this.onFragmentHit(fragment, player);
      }
    }
  }
  
  /**
   * fragment hits player
   */
  private onFragmentHit(fragment: TrackingFragment, player: any): void {
    fragment.hasHit = true;
    
    console.log('[CloakTracking] Fragment hit player!');
    
    // deal damage
    if (typeof player.takeDamage === 'function') {
      player.takeDamage(this.config.damage);
    }
    
    // text
    const x = fragment.graphics.x;
    const y = fragment.graphics.y;
    
    this.effects.createParticleBurst(x, y, 0x8b00ff, 10, 100);
    
    // remove fragment
    fragment.graphics.destroy();
    const index = this.fragments.indexOf(fragment);
    if (index !== -1) {
      this.fragments.splice(index, 1);
    }
    
    // if all fragments are gone,end early
    if (this.fragments.length === 0) {
      console.log('[CloakTracking] All fragments disappeared');
      this.cleanup();
    }
  }
  
  /**
   * cleanup
   */
  private cleanup(): void {
    this.fragments.forEach(fragment => {
      if (fragment.graphics && fragment.graphics.active) {
        fragment.graphics.destroy();
      }
    });
    this.fragments = [];
    
    if (this.updateEvent) {
      this.updateEvent.destroy();
      this.updateEvent = undefined;
    }
  }
  
  /**
   * destroy
   */
  destroy(): void {
    this.cleanup();
  }
}
