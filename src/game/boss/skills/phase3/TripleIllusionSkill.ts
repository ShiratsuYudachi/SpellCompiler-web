/**
 * TripleIllusionSkill - triple illusion(text)
 * Bosstext5sec,Spawned2illusion,text
 */

import Phaser from 'phaser';
import { worldFloatingTextStyle } from '../../../ui/inGameTextStyle';
import { BossSkill, SkillPhase } from '../BossSkill';

export class TripleIllusionSkill extends BossSkill {
  constructor(scene: Phaser.Scene) {
    super(scene, {
      name: 'TripleIllusion',
      damage: 50,
      cooldown: 20.0,
      phase: SkillPhase.Phase3,
      priority: 9,
    });
  }
  
  async execute(bossX: number, bossY: number, playerX: number, playerY: number): Promise<void> {
    this.isExecuting = true;
    console.log('[TripleIllusion] 2 illusion charge');
    
    // charge5sec
    const chargeEffect = this.scene.add.circle(bossX, bossY, 40, 0xff00ff, 0.3);
    
    for (let i = 0; i < 5; i++) {
      this.scene.tweens.add({
        targets: chargeEffect,
        scale: { from: 1, to: 1.5 },
        alpha: { from: 0.3, to: 0.6 },
        duration: 500,
        yoyo: true,
        repeat: 1
      });
      await this.delay(1000);
    }
    
    chargeEffect.destroy();
    
    // Spawned2text
    const illusion1 = this.createIllusion(bossX - 100, bossY - 50);
    const illusion2 = this.createIllusion(bossX + 100, bossY - 50);
    
    // text(text2charge slashes)
    const attacks = [
      this.illusionRush(illusion1, playerX, playerY),
      this.delay(800).then(() => this.illusionRush(illusion1, playerX, playerY)),
      this.delay(400).then(() => this.illusionRush(illusion2, playerX, playerY)),
      this.delay(1200).then(() => this.illusionRush(illusion2, playerX, playerY))
    ];
    
    await Promise.all(attacks);
    
    // text
    this.scene.tweens.add({
      targets: [illusion1, illusion2],
      alpha: 0,
      duration: 500,
      onComplete: () => {
        illusion1.destroy();
        illusion2.destroy();
      }
    });
    
    await this.delay(500);
    this.onComplete();
  }
  
  private createIllusion(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    
    // text
    const body = this.scene.add.circle(0, 0, 25, 0x8b00ff, 0.6);
    const label = this.scene.add.text(0, -40, 'ILLUSION', worldFloatingTextStyle('10px', '#ee88ff', { bold: true }));
    label.setOrigin(0.5);
    
    container.add([body, label]);
    
    // text
    this.scene.tweens.add({
      targets: body,
      alpha: { from: 0.6, to: 0.3 },
      duration: 300,
      yoyo: true,
      repeat: -1
    });
    
    return container;
  }
  
  private async illusionRush(illusion: Phaser.GameObjects.Container, targetX: number, targetY: number): Promise<void> {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // text
    targetX = player.x;
    targetY = player.y;
    
    // text
    const chargeCircle = this.scene.add.circle(illusion.x, illusion.y, 20, 0xff00ff, 0.5);
    this.scene.tweens.add({
      targets: chargeCircle,
      scale: 1.5,
      alpha: 0,
      duration: 600
    });
    
    await this.delay(600);
    chargeCircle.destroy();

    // charge
    this.scene.tweens.add({
      targets: illusion,
      x: targetX,
      y: targetY,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // slash
        const slashGraphics = this.scene.add.graphics();
        slashGraphics.lineStyle(6, 0xff00ff, 0.8);
        slashGraphics.arc(illusion.x, illusion.y, 60, -Math.PI * 0.5, Math.PI * 0.5, false);
        slashGraphics.strokePath();
        
        // text
        const dist = Phaser.Math.Distance.Between(illusion.x, illusion.y, player.x, player.y);
        if (dist < 60 && player.takeDamage) {
          player.takeDamage(40);
        }
        
        this.scene.tweens.add({
          targets: slashGraphics,
          alpha: 0,
          duration: 300,
          onComplete: () => slashGraphics.destroy()
        });
      }
    });
    
    await this.delay(400);
  }
}
