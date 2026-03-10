/**
 * teleportVisual - Teleport spell visual effect
 * Departure (disappear) and arrival (appear) effects
 */

import Phaser from 'phaser';

export interface TeleportVisualOptions {
  /** Effect color */
  color: number;
  /** Flash radius */
  radius: number;
  /** Animation duration (ms) */
  duration: number;
  /** Particle count */
  particleCount: number;
  /** Show shockwave */
  showShockwave: boolean;
}

const DEFAULT_OPTIONS: TeleportVisualOptions = {
  color: 0x00ffff,      // Cyan
  radius: 40,
  duration: 300,
  particleCount: 12,
  showShockwave: true,
};

/**
 * Play teleport visual (disappear + appear)
 * @param scene Phaser scene
 * @param x teleport X
 * @param y teleport Y
 * @param options optional config
 */
export function playTeleportVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Center flash
  createFlash(scene, x, y, opts);

  // 2. Particle burst
  createParticleBurst(scene, x, y, opts);

  // 3. Shockwave (optional)
  if (opts.showShockwave) {
    createShockwave(scene, x, y, opts);
  }
}

/**
 * Play teleport departure (disappear) effect
 */
export function playTeleportDisappear(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Imploding particles
  createImplodingParticles(scene, x, y, opts);

  // Quick flash
  createFlash(scene, x, y, { ...opts, duration: opts.duration * 0.5 });
}

/**
 * Play teleport arrival (appear) effect
 */
export function playTeleportAppear(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<TeleportVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Center flash
  createFlash(scene, x, y, opts);

  // Outward particle burst
  createParticleBurst(scene, x, y, opts);

  // Shockwave
  if (opts.showShockwave) {
    createShockwave(scene, x, y, opts);
  }
}

// ========================================
// Internal helpers
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
