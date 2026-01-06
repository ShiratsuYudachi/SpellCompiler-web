/**
 * HitboxManager - 碰撞检测管理器
 * 管理技能的伤害区域和碰撞检测
 */

import Phaser from 'phaser';

export interface DamageZone {
  graphics: Phaser.GameObjects.Graphics | Phaser.GameObjects.Shape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  damage: number;
  lifetime: number;
  onHit?: (target: any) => void;
}

export class HitboxManager {
  private scene: Phaser.Scene;
  private activeZones: DamageZone[] = [];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  /**
   * 创建矩形伤害区域
   */
  createRectZone(
    x: number,
    y: number,
    width: number,
    height: number,
    damage: number,
    lifetime: number = 1000,
    onHit?: (target: any) => void
  ): DamageZone {
    const graphics = this.scene.add.rectangle(x, y, width, height, 0xff0000, 0.3);
    
    const zone: DamageZone = {
      graphics,
      x,
      y,
      width,
      height,
      damage,
      lifetime,
      onHit,
    };
    
    this.activeZones.push(zone);
    
    // 自动移除
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * 创建圆形伤害区域
   */
  createCircleZone(
    x: number,
    y: number,
    radius: number,
    damage: number,
    lifetime: number = 1000,
    onHit?: (target: any) => void
  ): DamageZone {
    const graphics = this.scene.add.circle(x, y, radius, 0xff0000, 0.3);
    
    const zone: DamageZone = {
      graphics,
      x,
      y,
      radius,
      damage,
      lifetime,
      onHit,
    };
    
    this.activeZones.push(zone);
    
    // 自动移除
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * 创建线形伤害区域
   */
  createLineZone(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    thickness: number,
    damage: number,
    lifetime: number = 1000,
    onHit?: (target: any) => void
  ): DamageZone {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(thickness, 0xff0000, 0.3);
    graphics.lineBetween(x1, y1, x2, y2);
    
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    const zone: DamageZone = {
      graphics,
      x: midX,
      y: midY,
      width: Math.max(width, thickness),
      height: Math.max(height, thickness),
      damage,
      lifetime,
      onHit,
    };
    
    this.activeZones.push(zone);
    
    // 自动移除
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * 检测点是否在伤害区域内
   */
  checkPointCollision(x: number, y: number): DamageZone | null {
    for (const zone of this.activeZones) {
      if (this.isPointInZone(x, y, zone)) {
        return zone;
      }
    }
    return null;
  }
  
  /**
   * 判断点是否在区域内
   */
  private isPointInZone(x: number, y: number, zone: DamageZone): boolean {
    if (zone.radius !== undefined) {
      // 圆形检测
      const dx = x - zone.x;
      const dy = y - zone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= zone.radius;
    } else if (zone.width !== undefined && zone.height !== undefined) {
      // 矩形检测
      const left = zone.x - zone.width / 2;
      const right = zone.x + zone.width / 2;
      const top = zone.y - zone.height / 2;
      const bottom = zone.y + zone.height / 2;
      
      return x >= left && x <= right && y >= top && y <= bottom;
    }
    
    return false;
  }
  
  /**
   * 移除伤害区域
   */
  removeZone(zone: DamageZone): void {
    const index = this.activeZones.indexOf(zone);
    if (index !== -1) {
      this.activeZones.splice(index, 1);
    }
    
    if (zone.graphics && !zone.graphics.scene) {
      // 已经被销毁了
      return;
    }
    
    zone.graphics?.destroy();
  }
  
  /**
   * 获取所有活跃的伤害区域
   */
  getActiveZones(): DamageZone[] {
    return this.activeZones;
  }
  
  /**
   * 清除所有伤害区域
   */
  clearAll(): void {
    this.activeZones.forEach(zone => {
      zone.graphics?.destroy();
    });
    this.activeZones = [];
  }
  
  /**
   * 销毁
   */
  destroy(): void {
    this.clearAll();
  }
}
