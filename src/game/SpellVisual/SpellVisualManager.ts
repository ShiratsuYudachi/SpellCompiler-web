/**
 * SpellVisualManager - 法术视觉效果管理器
 * 提供统一的接口来播放各种法术施法动画
 */

import Phaser from 'phaser';
import { playTeleportVisual, type TeleportVisualOptions } from './Visuals/teleportVisual';
import { playFireballCastVisual, type FireballCastVisualOptions } from './Visuals/fireballVisual';

// 效果类型定义
export type SpellVisualType = 'teleport' | 'fireballCast';

// 通用选项接口
export interface BaseVisualOptions {
  x: number;
  y: number;
  color?: number;
  duration?: number;
}

/**
 * 法术视觉效果管理器
 * 可以通过实例方式使用，也可以通过静态方法使用
 */
export class SpellVisualManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 播放传送特效
   */
  teleport(x: number, y: number, options?: Partial<TeleportVisualOptions>): void {
    playTeleportVisual(this.scene, x, y, options);
  }

  /**
   * 播放火球施法特效
   */
  fireballCast(x: number, y: number, dirX: number, dirY: number, options?: Partial<FireballCastVisualOptions>): void {
    playFireballCastVisual(this.scene, x, y, dirX, dirY, options);
  }

  /**
   * 通用播放方法 - 根据类型播放对应特效
   */
  play(type: SpellVisualType, options: Record<string, any>): void {
    switch (type) {
      case 'teleport':
        this.teleport(options.x, options.y, options);
        break;
      case 'fireballCast':
        this.fireballCast(options.x, options.y, options.dirX, options.dirY, options);
        break;
      default:
        console.warn(`Unknown spell visual type: ${type}`);
    }
  }
}

// ========================================
// 静态函数式 API（直接使用，无需实例化）
// ========================================

/**
 * 播放传送特效
 * @param scene Phaser场景
 * @param x 目标X坐标
 * @param y 目标Y坐标
 * @param options 可选配置
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
 * 播放火球施法特效
 * @param scene Phaser场景
 * @param x 起始X坐标
 * @param y 起始Y坐标
 * @param dirX 方向X分量
 * @param dirY 方向Y分量
 * @param options 可选配置
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

// 重新导出所有视觉效果的类型
export type { TeleportVisualOptions } from './Visuals/teleportVisual';
export type { FireballCastVisualOptions } from './Visuals/fireballVisual';
