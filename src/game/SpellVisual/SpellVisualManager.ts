/**
 * SpellVisualManager - Spell visual effects manager
 * Unified API to play spell cast animations
 */

import Phaser from 'phaser';
import { playTeleportVisual, type TeleportVisualOptions } from './Visuals/teleportVisual';
import { playFireballCastVisual, type FireballCastVisualOptions } from './Visuals/fireballVisual';
import { playDamageHitVisual, type DamageHitVisualOptions } from './Visuals/damageVisual';

// Effect type
export type SpellVisualType = 'teleport' | 'fireballCast' | 'damageHit';

// Common options
export interface BaseVisualOptions {
  x: number;
  y: number;
  color?: number;
  duration?: number;
}

/**
 * Spell visual effects manager (instance or static API)
 */
export class SpellVisualManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Play teleport effect */
  teleport(x: number, y: number, options?: Partial<TeleportVisualOptions>): void {
    playTeleportVisual(this.scene, x, y, options);
  }

  /** Play fireball cast effect */
  fireballCast(x: number, y: number, dirX: number, dirY: number, options?: Partial<FireballCastVisualOptions>): void {
    playFireballCastVisual(this.scene, x, y, dirX, dirY, options);
  }

  /** Play damage hit effect */
  damageHit(x: number, y: number, amount: number, options?: Partial<DamageHitVisualOptions>): void {
    playDamageHitVisual(this.scene, x, y, amount, options);
  }

  /** Play effect by type */
  play(type: SpellVisualType, options: Record<string, any>): void {
    switch (type) {
      case 'teleport':
        this.teleport(options.x, options.y, options);
        break;
      case 'fireballCast':
        this.fireballCast(options.x, options.y, options.dirX, options.dirY, options);
        break;
      case 'damageHit':
        this.damageHit(options.x, options.y, options.amount, options);
        break;
      default:
        console.warn(`Unknown spell visual type: ${type}`);
    }
  }
}

// ========================================
// Static API (use without instantiating)
// ========================================

/**
 * Play teleport effect
 * @param scene Phaser scene
 * @param x target X
 * @param y target Y
 * @param options optional config
 */
export function playTeleport(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  playTeleportVisual(scene, x, y, options);
}

/**
 * Play fireball cast effect
 * @param scene Phaser scene
 * @param x start X
 * @param y start Y
 * @param dirX direction X
 * @param dirY direction Y
 * @param options optional config
 */
export function playFireballCast(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  options?: Partial<FireballCastVisualOptions>
): void {
  playFireballCastVisual(scene, x, y, dirX, dirY, options);
}

/**
 * Play damage hit effect
 * @param scene   Phaser scene
 * @param x       hit X
 * @param y       hit Y
 * @param amount  damage value
 * @param options optional config
 */
export function playDamageHit(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  options?: Partial<DamageHitVisualOptions>
): void {
  playDamageHitVisual(scene, x, y, amount, options);
}

// Re-export visual effect types
export type { TeleportVisualOptions } from './Visuals/teleportVisual';
export type { FireballCastVisualOptions } from './Visuals/fireballVisual';
export type { DamageHitVisualOptions } from './Visuals/damageVisual';
