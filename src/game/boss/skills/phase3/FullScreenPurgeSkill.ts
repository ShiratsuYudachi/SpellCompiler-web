/**
 * FullScreenPurgeSkill - 全屏肃清
 * 屏幕布满50条随机扫描线，1.5秒后所有交点爆炸，玩家必须找到唯一安全缝隙
 */

import Phaser from 'phaser';
import { BossSkill, SkillConfig, SkillPhase } from '../BossSkill';
import { BossEffects } from '../../visuals/BossEffects';

interface ScanLine {
  graphics: Phaser.GameObjects.Graphics;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isHorizontal: boolean;
}

interface Intersection {
  x: number;
  y: number;
}

export class FullScreenPurgeSkill extends BossSkill {
  private effects: BossEffects;
  private scanLines: ScanLine[] = [];
  private intersections: Intersection[] = [];
  
  constructor(scene: Phaser.Scene) {
    const config: SkillConfig = {
      name: 'FullScreenPurge',
      damage: 80, // 单次爆炸80伤害
      cooldown: 25.0, // 终极技能，长冷却
      phase: SkillPhase.Phase3,
      priority: 10, // 最高优先级
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
    
    console.log('[FullScreenPurge] 全屏肃清！');
    
    // 清理旧数据
    this.cleanup();
    
    // 屏幕变暗
    await this.darkenScreen();
    
    // 生成扫描线网格
    this.generateScanLines();
    
    // 计算交点
    this.calculateIntersections();
    
    // 1.5秒警告期
    await this.warningPhase();
    
    // 所有交点爆炸
    await this.explodeIntersections();
    
    // 清理
    this.cleanup();
    
    this.onComplete();
  }
  
  /**
   * 屏幕变暗
   */
  private async darkenScreen(): Promise<void> {
    const darkOverlay = this.scene.add.rectangle(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      this.scene.cameras.main.width,
      this.scene.cameras.main.height,
      0x000000,
      0
    );
    darkOverlay.setDepth(50);
    darkOverlay.setName('purge-overlay');
    
    this.scene.tweens.add({
      targets: darkOverlay,
      alpha: 0.5,
      duration: 500,
      ease: 'Cubic.easeIn',
    });
    
    await this.delay(500);
  }
  
  /**
   * 生成扫描线
   */
  private generateScanLines(): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;
    
    // 生成25条横线
    for (let i = 0; i < 25; i++) {
      const y = Math.random() * height;
      const line = this.effects.createScanLine(0, y, width, y);
      line.setDepth(51);
      
      this.scanLines.push({
        graphics: line,
        x1: 0,
        y1: y,
        x2: width,
        y2: y,
        isHorizontal: true,
      });
    }
    
    // 生成25条竖线
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * width;
      const line = this.effects.createScanLine(x, 0, x, height);
      line.setDepth(51);
      
      this.scanLines.push({
        graphics: line,
        x1: x,
        y1: 0,
        x2: x,
        y2: height,
        isHorizontal: false,
      });
    }
    
    console.log(`[FullScreenPurge] 生成了 ${this.scanLines.length} 条扫描线`);
  }
  
  /**
   * 计算所有交点
   */
  private calculateIntersections(): void {
    const horizontalLines = this.scanLines.filter(l => l.isHorizontal);
    const verticalLines = this.scanLines.filter(l => !l.isHorizontal);
    
    // 计算所有横竖线的交点
    for (const h of horizontalLines) {
      for (const v of verticalLines) {
        this.intersections.push({
          x: v.x1,
          y: h.y1,
        });
      }
    }
    
    // 找到并移除一个安全缝隙（随机选择玩家附近的一个区域）
    this.createSafeGap();
    
    console.log(`[FullScreenPurge] 计算了 ${this.intersections.length} 个交点`);
  }
  
  /**
   * 创建安全缝隙
   */
  private createSafeGap(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // 在玩家附近50px范围内移除交点，创造安全区
    const safeRadius = 40;
    
    this.intersections = this.intersections.filter(inter => {
      const dx = inter.x - player.x;
      const dy = inter.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance > safeRadius;
    });
    
    // 绘制安全区标记（绿色圆圈）
    const safeZone = this.scene.add.circle(
      player.x,
      player.y,
      safeRadius,
      0x00ff00,
      0.2
    );
    safeZone.setStrokeStyle(2, 0x00ff00, 0.6);
    safeZone.setDepth(52);
    safeZone.setName('safe-zone');
    
    // 脉动提示
    this.scene.tweens.add({
      targets: safeZone,
      alpha: { from: 0.3, to: 0.1 },
      duration: 300,
      yoyo: true,
      repeat: 4,
    });
  }
  
  /**
   * 警告阶段
   */
  private async warningPhase(): Promise<void> {
    // 显示警告文本
    const warningText = this.scene.add.text(
      this.scene.cameras.main.centerX,
      this.scene.cameras.main.centerY,
      '!!! 全屏肃清 !!!',
      {
        fontSize: '48px',
        color: '#ff0000',
        stroke: '#000000',
        strokeThickness: 6,
      }
    );
    warningText.setOrigin(0.5);
    warningText.setDepth(100);
    
    // 闪烁警告
    this.scene.tweens.add({
      targets: warningText,
      alpha: { from: 1, to: 0.3 },
      duration: 200,
      yoyo: true,
      repeat: 7,
    });
    
    // 绘制交点预警（红色小圆点）
    this.intersections.forEach(inter => {
      const dot = this.scene.add.circle(inter.x, inter.y, 3, 0xff0000, 0.6);
      dot.setDepth(52);
      dot.setName('intersection-dot');
      
      this.scene.tweens.add({
        targets: dot,
        scale: { from: 1, to: 1.5 },
        alpha: { from: 0.6, to: 0.2 },
        duration: 300,
        yoyo: true,
        repeat: 4,
      });
    });
    
    await this.delay(1500);
    
    warningText.destroy();
  }
  
  /**
   * 爆炸所有交点
   */
  private async explodeIntersections(): Promise<void> {
    console.log('[FullScreenPurge] 交点爆炸！');
    
    // 屏幕强烈闪烁
    this.effects.flashScreen(0xff0000, 200);
    
    // 相机剧烈震动
    this.scene.cameras.main.shake(500, 0.02);
    
    // 所有交点同时爆炸
    this.intersections.forEach((inter, index) => {
      // 稍微错开爆炸时间（增加视觉效果）
      this.scene.time.delayedCall(index * 2, () => {
        // 紫色光球
        const explosion = this.scene.add.circle(
          inter.x,
          inter.y,
          10,
          0x8b00ff,
          0.8
        );
        explosion.setDepth(53);
        
        this.scene.tweens.add({
          targets: explosion,
          radius: 30,
          alpha: 0,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => explosion.destroy(),
        });
      });
    });
    
    // 等待100ms后检测玩家碰撞
    await this.delay(100);
    this.checkPlayerDamage();
    
    await this.delay(400);
  }
  
  /**
   * 检测玩家伤害
   */
  private checkPlayerDamage(): void {
    const player = this.scene.children.getByName('player') as any;
    if (!player) return;
    
    // 检测玩家是否在任意爆炸范围内
    let hitCount = 0;
    
    for (const inter of this.intersections) {
      const dx = player.x - inter.x;
      const dy = player.y - inter.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 爆炸半径30px
      if (distance < 30) {
        hitCount++;
      }
    }
    
    if (hitCount > 0) {
      console.log(`[FullScreenPurge] 命中玩家！爆炸数: ${hitCount}`);
      
      // 每个爆炸造成伤害
      const totalDamage = this.config.damage * hitCount;
      
      if (typeof player.takeDamage === 'function') {
        player.takeDamage(totalDamage);
      }
      
      // 强烈击退
      const centerX = this.scene.cameras.main.centerX;
      const centerY = this.scene.cameras.main.centerY;
      const dx = player.x - centerX;
      const dy = player.y - centerY;
      const angle = Math.atan2(dy, dx);
      const knockbackForce = 200;
      
      this.scene.tweens.add({
        targets: player,
        x: player.x + Math.cos(angle) * knockbackForce,
        y: player.y + Math.sin(angle) * knockbackForce,
        duration: 300,
        ease: 'Cubic.easeOut',
      });
    } else {
      console.log('[FullScreenPurge] 玩家成功躲避！');
    }
  }
  
  /**
   * 清理
   */
  private cleanup(): void {
    // 清理扫描线
    this.scanLines.forEach(line => line.graphics.destroy());
    this.scanLines = [];
    
    // 清理交点
    this.intersections = [];
    
    // 清理叠加层
    const overlay = this.scene.children.getByName('purge-overlay');
    if (overlay) {
      this.scene.tweens.add({
        targets: overlay,
        alpha: 0,
        duration: 500,
        onComplete: () => overlay.destroy(),
      });
    }
    
    // 清理安全区
    const safeZone = this.scene.children.getByName('safe-zone');
    if (safeZone) safeZone.destroy();
    
    // 清理交点标记
    const dots = this.scene.children.getAll().filter(
      (obj: any) => obj.name === 'intersection-dot'
    );
    dots.forEach(dot => dot.destroy());
  }
  
  /**
   * 延迟工具函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.scene.time.delayedCall(ms, () => resolve());
    });
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    this.cleanup();
  }
}
