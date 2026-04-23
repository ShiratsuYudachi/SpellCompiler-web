/**
 * ShadowEchoSkill - Phase2decoy(text)
 * Phase2at startSpawn decoy,50%health,textandshoot
 */

import Phaser from 'phaser';
import { worldFloatingTextStyle } from '../../../ui/inGameTextStyle';
import { BossSkill, SkillPhase } from '../BossSkill';

export class ShadowEchoSkill extends BossSkill {
  private shadow?: Phaser.GameObjects.Container;
  private shadowHealth: number = 0;
  private shadowMaxHealth: number = 0;
  
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'ShadowEcho',
      damage: 30,
      cooldown: 999, // Phase2text
      phase: SkillPhase.Phase2,
      priority: 8,
    });
  }
  
  async execute(bossX: number, bossY: number, _playerX: number, _playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[ShadowEcho] Spawn decoy');
    
    // getBosshealth
    const boss = this.scene.children.getByName('boss-container') as any;
    this.shadowMaxHealth = boss ? Math.floor((boss.health || 500) * 0.5) : 250;
    this.shadowHealth = this.shadowMaxHealth;
    
    // text
    this.createShadow(bossX + 150, bossY);
    
    // decoyAIloop
    this.startShadowAI();
    
    this.onComplete();
  }
  
  private createShadow(x: number, y: number): void {
    this.shadow = this.scene.add.container(x, y);
    this.shadow.setName('boss-shadow');
    
    // text
    const bodyGraphics = this.scene.add.graphics();
    bodyGraphics.fillStyle(0x4a0080, 0.7);
    bodyGraphics.fillCircle(0, 0, 30);
    
    // text
    const label = this.scene.add.text(0, -50, 'SHADOW', worldFloatingTextStyle('12px', '#c090c8', { bold: true }));
    label.setOrigin(0.5);
    
    this.shadow.add([bodyGraphics, label]);
  }
  
  private startShadowAI(): void {
    const aiLoop = this.scene.time.addEvent({
      delay: 3000,
      callback: () => {
        if (!this.shadow || this.shadowHealth <= 0) {
          aiLoop.destroy();
          return;
        }
        
        const player = this.scene.children.getByName('player') as any;
        if (!player) return;
        
        const dist = Phaser.Math.Distance.Between(
          this.shadow.x,
          this.shadow.y,
          player.x,
          player.y
        );
        
        if (dist < 120) {
          // Melee slash
          this.shadowSlash(player);
        } else if (dist < 300) {
          // Ranged shot
          this.shadowShoot(player);
        }
      },
      loop: true
    });
  }
  
  private shadowSlash(player: any): void {
    if (!this.shadow) return;
    
    const slashGraphics = this.scene.add.graphics();
    slashGraphics.lineStyle(6, 0x8b1a8b, 0.8);
    slashGraphics.arc(this.shadow.x, this.shadow.y, 60, -Math.PI * 0.5, Math.PI * 0.5, false);
    slashGraphics.strokePath();
    
    const dist = Phaser.Math.Distance.Between(
      this.shadow.x,
      this.shadow.y,
      player.x,
      player.y
    );
    
    if (dist < 60 && player.takeDamage) {
      player.takeDamage(30);
    }
    
    this.scene.tweens.add({
      targets: slashGraphics,
      alpha: 0,
      duration: 300,
      onComplete: () => slashGraphics.destroy()
    });
  }
  
  private shadowShoot(player: any): void {
    if (!this.shadow) return;
    
    const bullet = this.scene.add.circle(this.shadow.x, this.shadow.y, 6, 0x8b1a8b);
    
    this.scene.tweens.add({
      targets: bullet,
      x: player.x,
      y: player.y,
      duration: 800,
      onUpdate: () => {
        const dist = Phaser.Math.Distance.Between(bullet.x, bullet.y, player.x, player.y);
        if (dist < 25 && player.takeDamage) {
          player.takeDamage(20);
          bullet.destroy();
        }
      },
      onComplete: () => bullet.destroy()
    });
  }
  
  // public damage API
  public damageShadow(amount: number): void {
    if (!this.shadow) return;
    
    this.shadowHealth -= amount;
    
    if (this.shadowHealth <= 0) {
      // decoyDied
      this.scene.tweens.add({
        targets: this.shadow,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        onComplete: () => {
          this.shadow?.destroy();
          this.shadow = undefined;
        }
      });
    }
  }
}
