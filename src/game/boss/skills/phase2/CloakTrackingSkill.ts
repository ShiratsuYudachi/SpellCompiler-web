/**
 * CloakTrackingSkill - 斗篷追踪
 * Boss斗篷的12个碎片全部飞出，独立追踪玩家
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
      damage: 10, // 每个碎片10伤害
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
    
    console.log('[CloakTracking] 斗篷追踪激活！');
    
    // 清理旧碎片
    this.cleanup();
    
    // 创建12个追踪碎片
    this.createTrackingFragments(bossX, bossY);
    
    // 开始追踪玩家
    this.startTracking();
    
    // 持续5秒或全部碎片消失
    await this.delay(5000);
    
    this.cleanup();
    this.onComplete();
  }
  
  /**
   * 创建追踪碎片
   */
  private createTrackingFragments(centerX: number, centerY: number): void {
    const fragmentCount = 12;
    
    for (let i = 0; i < fragmentCount; i++) {
      const angle = (Math.PI * 2 / fragmentCount) * i;
      const startRadius = 60;
      
      // 创建三角形碎片
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
      
      // 每个碎片速度略有不同
      const speed = 120 + Math.random() * 30;
      
      this.fragments.push({
        graphics: fragment,
        speed,
        hasHit: false,
      });
      
      // 启动拖尾效果
      this.startTrailEffect(fragment);
    }
  }
  
  /**
   * 启动拖尾效果
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
   * 开始追踪
   */
  private startTracking(): void {
    this.updateEvent = this.scene.time.addEvent({
      delay: 16, // ~60 FPS
      callback: () => this.updateFragments(),
      loop: true,
    });
  }
  
  /**
   * 更新碎片位置
   */
  private updateFragments(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    const delta = this.scene.game.loop.delta / 1000;
    
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const fragment = this.fragments[i];
      
      if (fragment.hasHit) continue;
      
      // 计算到玩家的方向
      const dx = player.x - fragment.graphics.x;
      const dy = player.y - fragment.graphics.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 移动碎片
      const moveX = (dx / distance) * fragment.speed * delta;
      const moveY = (dy / distance) * fragment.speed * delta;
      
      fragment.graphics.x += moveX;
      fragment.graphics.y += moveY;
      
      // 旋转朝向玩家
      const angle = Math.atan2(dy, dx);
      fragment.graphics.setRotation(angle + Math.PI / 2);
      
      // 检测碰撞
      if (distance < 20) {
        this.onFragmentHit(fragment, player);
      }
    }
  }
  
  /**
   * 碎片命中玩家
   */
  private onFragmentHit(fragment: TrackingFragment, player: any): void {
    fragment.hasHit = true;
    
    console.log('[CloakTracking] 碎片命中玩家！');
    
    // 造成伤害
    if (typeof player.takeDamage === 'function') {
      player.takeDamage(this.config.damage);
    }
    
    // 碎片爆炸
    const x = fragment.graphics.x;
    const y = fragment.graphics.y;
    
    this.effects.createParticleBurst(x, y, 0x8b00ff, 10, 100);
    
    // 移除碎片
    fragment.graphics.destroy();
    const index = this.fragments.indexOf(fragment);
    if (index !== -1) {
      this.fragments.splice(index, 1);
    }
    
    // 如果所有碎片都消失了，提前结束
    if (this.fragments.length === 0) {
      console.log('[CloakTracking] 所有碎片已消失');
      this.cleanup();
    }
  }
  
  /**
   * 清理
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
   * 销毁
   */
  destroy(): void {
    this.cleanup();
  }
}
