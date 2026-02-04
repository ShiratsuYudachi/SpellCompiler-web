/**
 * teleportVisual - 传送法术视觉效果
 * 包含传送起点消失效果和传送终点出现效果
 */

import Phaser from 'phaser';

export interface TeleportVisualOptions {
  /** 效果颜色 */
  color: number;
  /** 闪光半径 */
  radius: number;
  /** 动画持续时间(ms) */
  duration: number;
  /** 粒子数量 */
  particleCount: number;
  /** 是否显示冲击波 */
  showShockwave: boolean;
}

const DEFAULT_OPTIONS: TeleportVisualOptions = {
  color: 0x00ffff,      // 青色
  radius: 40,
  duration: 300,
  particleCount: 12,
  showShockwave: true,
};

/**
 * 播放传送视觉效果（起点消失 + 终点出现）
 * @param scene Phaser场景
 * @param x 传送位置X
 * @param y 传送位置Y
 * @param options 可选配置
 */
export function playTeleportVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. 中心闪光
  createFlash(scene, x, y, opts);

  // 2. 粒子爆发
  createParticleBurst(scene, x, y, opts);

  // 3. 冲击波（可选）
  if (opts.showShockwave) {
    createShockwave(scene, x, y, opts);
  }
}

/**
 * 播放传送起点消失效果
 */
export function playTeleportDisappear(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 向内收缩的粒子效果
  createImplodingParticles(scene, x, y, opts);

  // 快速闪光
  createFlash(scene, x, y, { ...opts, duration: opts.duration * 0.5 });
}

/**
 * 播放传送终点出现效果
 */
export function playTeleportAppear(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 中心闪光
  createFlash(scene, x, y, opts);

  // 向外扩散的粒子
  createParticleBurst(scene, x, y, opts);

  // 冲击波
  if (opts.showShockwave) {
    createShockwave(scene, x, y, opts);
  }
}

// ========================================
// 内部辅助函数
// ========================================

function createFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: TeleportVisualOptions
): void {
  const flash = scene.add.circle(x, y, opts.radius * 0.6, opts.color, 0.8);
  flash.setDepth(100);

  scene.tweens.add({
    targets: flash,
    alpha: 0,
    scale: 2,
    duration: opts.duration,
    ease: 'Cubic.easeOut',
    onComplete: () => flash.destroy(),
  });
}

function createParticleBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: TeleportVisualOptions
): void {
  const { color, particleCount, radius, duration } = opts;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 / particleCount) * i;
    const particle = scene.add.rectangle(x, y, 6, 6, color);
    particle.setDepth(100);

    const targetX = x + Math.cos(angle) * radius * 1.5;
    const targetY = y + Math.sin(angle) * radius * 1.5;

    scene.tweens.add({
      targets: particle,
      x: targetX,
      y: targetY,
      alpha: 0,
      scale: 0.3,
      duration: duration * 1.2,
      ease: 'Cubic.easeOut',
      onComplete: () => particle.destroy(),
    });
  }
}

function createImplodingParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: TeleportVisualOptions
): void {
  const { color, particleCount, radius, duration } = opts;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 / particleCount) * i;
    const startX = x + Math.cos(angle) * radius * 1.5;
    const startY = y + Math.sin(angle) * radius * 1.5;

    const particle = scene.add.rectangle(startX, startY, 6, 6, color);
    particle.setDepth(100);

    scene.tweens.add({
      targets: particle,
      x: x,
      y: y,
      alpha: 0,
      scale: 0.3,
      duration: duration,
      ease: 'Cubic.easeIn',
      onComplete: () => particle.destroy(),
    });
  }
}

function createShockwave(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: TeleportVisualOptions
): void {
  const wave = scene.add.circle(x, y, 10, 0x000000, 0);
  wave.setStrokeStyle(2, opts.color, 1);
  wave.setDepth(99);

  scene.tweens.add({
    targets: wave,
    radius: opts.radius * 2,
    alpha: 0,
    duration: opts.duration * 1.5,
    ease: 'Cubic.easeOut',
    onComplete: () => wave.destroy(),
  });
}
