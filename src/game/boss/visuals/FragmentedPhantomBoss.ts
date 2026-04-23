/**
 * FragmentedPhantomBoss - textBossvisual(text)
 * fix:text
 */

import Phaser from 'phaser';
import { BossFragment, FragmentShape } from './BossFragment';
import { BossEffects } from './BossEffects';

export class FragmentedPhantomBoss {
  private scene: Phaser.Scene;
  private effects: BossEffects;
  
  private headFragments: BossFragment[] = [];
  private bodyFragments: BossFragment[] = [];
  private cloakFragments: BossFragment[] = [];
  
  private leftBlade?: Phaser.GameObjects.Graphics;
  private rightBlade?: Phaser.GameObjects.Graphics;
  
  private phantoms: Phaser.GameObjects.Graphics[] = [];
  
  private x: number;
  private y: number;
  
  private container: Phaser.GameObjects.Container;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.effects = new BossEffects(scene);
    
    // text
    this.container = scene.add.container(x, y);
    
    // text(text)
    this.createFragments();
    
    // text
    this.createBlades();
    
    // text
    this.startIdleAnimation();
  }
  
  private createFragments(): void {
    this.createHeadFragments();
    this.createBodyFragments();
    this.createCloakFragments();
  }
  
  private createHeadFragments(): void {
    const headColor = 0x2b2b2b;
    
    // text - text
    const centerHead = new BossFragment(this.scene, {
      x: 0,
      y: -60,
      shape: FragmentShape.Triangle,
      size: 30,
      color: headColor,
    });
    this.headFragments.push(centerHead);
    this.container.add(centerHead.getGraphics());
    
    // text
    const leftHead = new BossFragment(this.scene, {
      x: -15,
      y: -50,
      shape: FragmentShape.Triangle,
      size: 20,
      color: headColor,
      rotation: Math.PI / 6,
    });
    this.headFragments.push(leftHead);
    this.container.add(leftHead.getGraphics());
    
    // text
    const rightHead = new BossFragment(this.scene, {
      x: 15,
      y: -50,
      shape: FragmentShape.Triangle,
      size: 20,
      color: headColor,
      rotation: -Math.PI / 6,
    });
    this.headFragments.push(rightHead);
    this.container.add(rightHead.getGraphics());
  }
  
  private createBodyFragments(): void {
    const bodyColor = 0x1a1a1a;
    
    // text
    const center = new BossFragment(this.scene, {
      x: 0,
      y: -20,
      shape: FragmentShape.Quadrilateral,
      size: 40,
      color: bodyColor,
    });
    this.bodyFragments.push(center);
    this.container.add(center.getGraphics());
    
    // text
    const leftShoulder = new BossFragment(this.scene, {
      x: -30,
      y: -30,
      shape: FragmentShape.Quadrilateral,
      size: 25,
      color: bodyColor,
      rotation: Math.PI / 8,
    });
    this.bodyFragments.push(leftShoulder);
    this.container.add(leftShoulder.getGraphics());
    
    // text
    const rightShoulder = new BossFragment(this.scene, {
      x: 30,
      y: -30,
      shape: FragmentShape.Quadrilateral,
      size: 25,
      color: bodyColor,
      rotation: -Math.PI / 8,
    });
    this.bodyFragments.push(rightShoulder);
    this.container.add(rightShoulder.getGraphics());
    
    // text
    const waist = new BossFragment(this.scene, {
      x: 0,
      y: 10,
      shape: FragmentShape.Quadrilateral,
      size: 35,
      color: bodyColor,
      rotation: Math.PI / 12,
    });
    this.bodyFragments.push(waist);
    this.container.add(waist.getGraphics());
    
    // text
    const lower = new BossFragment(this.scene, {
      x: 0,
      y: 35,
      shape: FragmentShape.Quadrilateral,
      size: 30,
      color: bodyColor,
    });
    this.bodyFragments.push(lower);
    this.container.add(lower.getGraphics());
  }
  
  private createCloakFragments(): void {
    const cloakColor = 0x3a1a4d;
    const numFragments = 12;
    
    for (let i = 0; i < numFragments; i++) {
      const angle = (Math.PI * 2 / numFragments) * i;
      const distance = 50 + Math.random() * 20;
      
      const fragment = new BossFragment(this.scene, {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        shape: FragmentShape.Triangle,
        size: 15 + Math.random() * 10,
        color: cloakColor,
        rotation: angle,
      });
      
      this.cloakFragments.push(fragment);
      this.container.add(fragment.getGraphics());
    }
  }
  
  private createBlades(): void {
    // text
    this.leftBlade = this.scene.add.graphics();
    this.leftBlade.lineStyle(3, 0x8b00ff, 1);
    this.leftBlade.lineBetween(0, 0, -30, -40);
    this.leftBlade.setPosition(-20, -20); // text
    this.container.add(this.leftBlade);
    
    // text
    this.rightBlade = this.scene.add.graphics();
    this.rightBlade.lineStyle(3, 0x8b00ff, 1);
    this.rightBlade.lineBetween(0, 0, 30, -40);
    this.rightBlade.setPosition(20, -20); // text
    this.container.add(this.rightBlade);
  }
  
  private startIdleAnimation(): void {
    // text
    [...this.headFragments, ...this.bodyFragments, ...this.cloakFragments].forEach((frag, i) => {
      this.scene.tweens.add({
        targets: frag.getGraphics(),
        y: frag.getGraphics().y + (Math.random() - 0.5) * 10,
        duration: 1000 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 50,
      });
    });
    
    // text
    if (this.leftBlade && this.rightBlade) {
      this.scene.tweens.add({
        targets: [this.leftBlade, this.rightBlade],
        angle: '+=5',
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
  
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.container.setPosition(x, y);
    this.updatePhantoms();
  }
  
  updatePosition(x: number, y: number): void {
    // text,text
    this.setPosition(x, y);
  }
  
  private updatePhantoms(): void {
    // text(text)
    if (this.phantoms.length > 3) {
      const oldest = this.phantoms.shift();
      oldest?.destroy();
    }
    
    const phantom = this.scene.add.graphics();
    phantom.fillStyle(0x8b00ff, 0.1);
    phantom.fillCircle(this.x, this.y, 40);
    this.phantoms.push(phantom);
    
    this.scene.tweens.add({
      targets: phantom,
      alpha: 0,
      duration: 500,
      onComplete: () => {
        const index = this.phantoms.indexOf(phantom);
        if (index > -1) this.phantoms.splice(index, 1);
        phantom.destroy();
      },
    });
  }
  
  changePhase(phase: number): void {
    console.log(`[FragmentedPhantomBoss] Switch to phase ${phase}`);
    
    const newColor = phase === 0 ? 0x3a1a4d : phase === 1 ? 0x8b1a8b : 0xff0066;
    
    this.cloakFragments.forEach(frag => {
      this.scene.tweens.add({
        targets: frag.getGraphics(),
        alpha: 0,
        duration: 200,
        onComplete: () => {
          frag.setColor(newColor);
          this.scene.tweens.add({
            targets: frag.getGraphics(),
            alpha: 1,
            duration: 200,
          });
        },
      });
    });
  }
  
  updatePhase(phase: number): void {
    // text,text
    this.changePhase(phase);
  }
  
  flash(duration: number = 100): void {
    // GraphicstextsetTint,usealphatext

    // text
    const flashOverlay = this.scene.add.graphics();
    flashOverlay.fillStyle(0xffffff, 0.6);
    flashOverlay.fillCircle(0, 0, 100); // text
    this.container.add(flashOverlay);
    
    // text
    this.scene.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: duration,
      onComplete: () => flashOverlay.destroy(),
    });
  }
  
  explode(): void {
    console.log('[FragmentedPhantomBoss] Death explosion');
    
    const allFragments = [...this.headFragments, ...this.bodyFragments, ...this.cloakFragments];
    
    allFragments.forEach((frag, i) => {
      const graphics = frag.getGraphics();
      const angle = (Math.PI * 2 / allFragments.length) * i;
      
      this.scene.tweens.add({
        targets: graphics,
        x: graphics.x + Math.cos(angle) * 200,
        y: graphics.y + Math.sin(angle) * 200,
        alpha: 0,
        rotation: graphics.rotation + Math.PI * 2,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onComplete: () => graphics.destroy(),
      });
    });
    
    if (this.leftBlade) {
      this.scene.tweens.add({
        targets: this.leftBlade,
        alpha: 0,
        rotation: Math.PI * 3,
        duration: 1000,
        onComplete: () => this.leftBlade?.destroy(),
      });
    }
    
    if (this.rightBlade) {
      this.scene.tweens.add({
        targets: this.rightBlade,
        alpha: 0,
        rotation: -Math.PI * 3,
        duration: 1000,
        onComplete: () => this.rightBlade?.destroy(),
      });
    }
    
    this.effects.createExplosion(this.x, this.y, 100, 0x8b00ff);
    
    this.scene.time.delayedCall(1000, () => {
      this.container.destroy();
    });
  }
  
  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }
  
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  
  destroy(): void {
    this.phantoms.forEach(p => p.destroy());
    this.container.destroy();
  }
}
