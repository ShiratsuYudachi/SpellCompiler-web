/**
 * HitboxManager - text
 * textandtext
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
   * text
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
    
    // text
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * text
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
    
    // text
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * text
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
    
    // text
    this.scene.time.delayedCall(lifetime, () => {
      this.removeZone(zone);
    });
    
    return zone;
  }
  
  /**
   * text
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
   * text
   */
  private isPointInZone(x: number, y: number, zone: DamageZone): boolean {
    if (zone.radius !== undefined) {
      // text
      const dx = x - zone.x;
      const dy = y - zone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= zone.radius;
    } else if (zone.width !== undefined && zone.height !== undefined) {
      // text
      const left = zone.x - zone.width / 2;
      const right = zone.x + zone.width / 2;
      const top = zone.y - zone.height / 2;
      const bottom = zone.y + zone.height / 2;
      
      return x >= left && x <= right && y >= top && y <= bottom;
    }
    
    return false;
  }
  
  /**
   * text
   */
  removeZone(zone: DamageZone): void {
    const index = this.activeZones.indexOf(zone);
    if (index !== -1) {
      this.activeZones.splice(index, 1);
    }
    
    if (zone.graphics && !zone.graphics.scene) {
      // text
      return;
    }
    
    zone.graphics?.destroy();
  }
  
  /**
   * text
   */
  getActiveZones(): DamageZone[] {
    return this.activeZones;
  }
  
  /**
   * text
   */
  clearAll(): void {
    this.activeZones.forEach(zone => {
      zone.graphics?.destroy();
    });
    this.activeZones = [];
  }
  
  /**
   * destroy
   */
  destroy(): void {
    this.clearAll();
  }
}
