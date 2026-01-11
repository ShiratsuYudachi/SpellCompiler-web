/**
 * FragmentedPhantomBoss - 破碎幻影Boss视觉（修复版）
 * 修复：使用相对坐标避免错位
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
    
    // 创建容器
    this.container = scene.add.container(x, y);
    
    // 创建所有碎片（使用相对坐标）
    this.createFragments();
    
    // 创建武器
    this.createBlades();
    
    // 启动动画
    this.startIdleAnimation();
  }
  
  private createFragments(): void {
    this.createHeadFragments();
    this.createBodyFragments();
    this.createCloakFragments();
  }
  
  private createHeadFragments(): void {
    const headColor = 0x2b2b2b;
    
    // 中央三角 - 相对坐标
    const centerHead = new BossFragment(this.scene, {
      x: 0,
      y: -60,
      shape: FragmentShape.Triangle,
      size: 30,
      color: headColor,
    });
    this.headFragments.push(centerHead);
    this.container.add(centerHead.getGraphics());
    
    // 左侧三角
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
    
    // 右侧三角
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
    
    // 躯干中央
    const center = new BossFragment(this.scene, {
      x: 0,
      y: -20,
      shape: FragmentShape.Quadrilateral,
      size: 40,
      color: bodyColor,
    });
    this.bodyFragments.push(center);
    this.container.add(center.getGraphics());
    
    // 左肩
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
    
    // 右肩
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
    
    // 腰部
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
    
    // 下身
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
    // 左刀
    this.leftBlade = this.scene.add.graphics();
    this.leftBlade.lineStyle(3, 0x8b00ff, 1);
    this.leftBlade.lineBetween(0, 0, -30, -40);
    this.leftBlade.setPosition(-20, -20); // 相对容器
    this.container.add(this.leftBlade);
    
    // 右刀
    this.rightBlade = this.scene.add.graphics();
    this.rightBlade.lineStyle(3, 0x8b00ff, 1);
    this.rightBlade.lineBetween(0, 0, 30, -40);
    this.rightBlade.setPosition(20, -20); // 相对容器
    this.container.add(this.rightBlade);
  }
  
  private startIdleAnimation(): void {
    // 碎片浮动
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
    
    // 武器摆动
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
    // 别名方法，兼容旧代码
    this.setPosition(x, y);
  }
  
  private updatePhantoms(): void {
    // 残影效果（简化）
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
    console.log(`[FragmentedPhantomBoss] 切换到阶段 ${phase}`);
    
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
    // 别名方法，兼容旧代码
    this.changePhase(phase);
  }
  
  flash(duration: number = 100): void {
    // Graphics对象没有setTint，使用alpha闪烁效果

    // 创建白色闪光覆盖层
    const flashOverlay = this.scene.add.graphics();
    flashOverlay.fillStyle(0xffffff, 0.6);
    flashOverlay.fillCircle(0, 0, 100); // 相对容器
    this.container.add(flashOverlay);
    
    // 闪光淡出
    this.scene.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: duration,
      onComplete: () => flashOverlay.destroy(),
    });
  }
  
  explode(): void {
    console.log('[FragmentedPhantomBoss] 死亡爆炸');
    
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
