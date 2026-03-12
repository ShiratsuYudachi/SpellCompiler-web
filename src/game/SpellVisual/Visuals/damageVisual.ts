/**
 * damageVisual - Damage hit visual effect
 * Impact flash, shockwave rings, energy burst, floating damage number
 * Style aligned with fireballVisual / teleportVisual (Phaser tween + circular particles)
 */

import Phaser from 'phaser';

export interface DamageHitVisualOptions {
  /** Impact main color (default: red) */
  color?: number;
  /** Inner impact color */
  innerColor?: number;
  /** Core flash color (brightest) */
  coreColor?: number;
  /** Effect radius */
  radius?: number;
  /** Total animation duration (ms) */
  duration?: number;
  /** Particle count */
  particleCount?: number;
  /** Show floating damage number */
  showNumber?: boolean;
}

const DEFAULT_OPTIONS: Required<DamageHitVisualOptions> = {
  color: 0xff3344,       // Red impact
  innerColor: 0xff8844,  // Orange-red inner
  coreColor: 0xffddaa,   // Bright yellow-white core
  radius: 22,
  duration: 280,
  particleCount: 7,
  showNumber: true,
};

/**
 * Play damage hit visual effect
 * @param scene   Phaser scene
 * @param x       hit X
 * @param y       hit Y
 * @param amount  damage value (for floating number)
 * @param options optional config
 */
export function playDamageHitVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  options?: DamageHitVisualOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Impact core flash (fast expanding solid circle)
  createImpactFlash(scene, x, y, opts);

  // 2. Shockwave rings
  createShockwaveRings(scene, x, y, opts);

  // 3. Energy burst (particles radiating outward)
  createEnergyBurst(scene, x, y, opts);

  // 4. Floating damage number
  if (opts.showNumber && amount > 0) {
    createFloatingDamageNumber(scene, x, y, amount, opts);
  }
}

// ========================================
// Internal helpers
// ========================================

/**
 * Impact core flash: double solid circle, fast expand and fade
 */
function createImpactFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: Required<DamageHitVisualOptions>
): void {
  // White core (innermost)
  const core = scene.add.circle(x, y, opts.radius * 0.25, opts.coreColor, 1.0);
  core.setDepth(101);
  scene.tweens.add({
    targets: core,
    scaleX: 3.5,
    scaleY: 3.5,
    alpha: 0,
    duration: opts.duration * 0.5,
    ease: 'Cubic.easeOut',
    onComplete: () => core.destroy(),
  });

  // Outer red glow
  const glow = scene.add.circle(x, y, opts.radius * 0.5, opts.color, 0.55);
  glow.setDepth(100);
  scene.tweens.add({
    targets: glow,
    scaleX: 2.5,
    scaleY: 2.5,
    alpha: 0,
    duration: opts.duration * 0.7,
    ease: 'Cubic.easeOut',
    onComplete: () => glow.destroy(),
  });
}

/**
 * Shockwave rings: two hollow rings expanding outward
 */
function createShockwaveRings(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: Required<DamageHitVisualOptions>
): void {
  const rings = [
    { color: opts.coreColor, startRadius: opts.radius * 0.15, delay: 0,  thickness: 3 },
    { color: opts.innerColor, startRadius: opts.radius * 0.30, delay: 40, thickness: 2 },
  ];

  for (const { color, startRadius, delay, thickness } of rings) {
    scene.time.delayedCall(delay, () => {
      const ring = scene.add.circle(x, y, startRadius, 0x000000, 0);
      ring.setStrokeStyle(thickness, color, 1.0);
      ring.setDepth(100);
      scene.tweens.add({
        targets: ring,
        radius: opts.radius * 2.2,
        alpha: 0,
        duration: opts.duration * 0.9,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  }
}

/**
 * Energy burst: small particles from hit point outward
 */
function createEnergyBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: Required<DamageHitVisualOptions>
): void {
  const colors = [opts.color, opts.innerColor, opts.coreColor];

  for (let i = 0; i < opts.particleCount; i++) {
    // Even distribution + random offset to avoid overly mechanical look
    const angle = (Math.PI * 2 / opts.particleCount) * i + (Math.random() - 0.5) * 0.5;
    const dist  = opts.radius * (1.1 + Math.random() * 0.9);
    const size  = 2.5 + Math.random() * 2.5;
    const c     = colors[i % colors.length];

    const p = scene.add.circle(x, y, size, c, 0.9);
    p.setDepth(100);

    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: opts.duration * (0.65 + Math.random() * 0.35),
      ease: 'Cubic.easeOut',
      onComplete: () => p.destroy(),
    });
  }
}

/**
 * Floating damage number: "-X" rises from hit point and fades
 * Black shadow for readability
 */
function createFloatingDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  opts: Required<DamageHitVisualOptions>
): void {
  const label = `-${amount}`;
  const startY = y - 14;
  const floatDist = 30 + Math.random() * 10;
  const drift = (Math.random() - 0.5) * 12; // Slight horizontal offset so multiple numbers don't overlap

  // Shadow layer
  const shadow = scene.add
    .text(x + 1, startY + 1, label, {
      fontSize: '15px',
      color: '#220000',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(101)
    .setAlpha(0.55);

  // Main number
  const text = scene.add
    .text(x, startY, label, {
      fontSize: '15px',
      color: '#ff5566',
      fontStyle: 'bold',
      stroke: '#330000',
      strokeThickness: 2,
    })
    .setOrigin(0.5)
    .setDepth(102);

  scene.tweens.add({
    targets: [text, shadow],
    y: startY - floatDist,
    x: x + drift,
    alpha: 0,
    duration: opts.duration * 2.4,
    ease: 'Cubic.easeOut',
    onComplete: () => {
      text.destroy();
      shadow.destroy();
    },
  });
}
