/**
 * fireballVisual - Fireball spell visual effect
 * Magic aura style: layered rings, orbiting particles, direction arrow
 */

import Phaser from 'phaser';

export interface FireballCastVisualOptions {
  /** Flame main color */
  color: number;
  /** Flame inner color */
  innerColor: number;
  /** Core color (brightest) */
  coreColor: number;
  /** Effect radius */
  radius: number;
  /** Animation duration (ms) */
  duration: number;
  /** Particle count */
  particleCount: number;
  /** Show direction indicator */
  showDirection: boolean;
  /** Show glow */
  showGlow: boolean;
}

const DEFAULT_OPTIONS: FireballCastVisualOptions = {
  color: 0xff6600,        // Orange flame
  innerColor: 0xffaa00,   // Gold
  coreColor: 0xffffcc,    // Bright yellow-white core
  radius: 35,
  duration: 350,
  particleCount: 10,
  showDirection: true,
  showGlow: true,
};

/**
 * Play fireball cast visual (magic aura style)
 */
export function playFireballCastVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  options?: Partial<FireballCastVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. Center glow
  if (opts.showGlow) {
    createGlowEffect(scene, x, y, opts);
  }

  // 2. Magic rings
  createMagicRings(scene, x, y, opts);

  // 3. Orbiting flame particles
  createOrbitingParticles(scene, x, y, opts);

  // 4. Direction arrow
  if (opts.showDirection) {
    createMagicArrow(scene, x, y, dirX, dirY, opts);
  }
}

/**
 * Play fireball charge effect
 */
export function playFireballChargeVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  options?: Partial<FireballCastVisualOptions>
): Phaser.GameObjects.Container {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const container = scene.add.container(x, y);
  container.setDepth(100);

  // Outer glow
  const glow = scene.add.circle(0, 0, opts.radius * 0.8, opts.color, 0.3);
  container.add(glow);

  // Inner pulsing core
  const core = scene.add.circle(0, 0, opts.radius * 0.3, opts.coreColor, 0.9);
  container.add(core);

  // Orbiting particle ring
  const particles: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const px = Math.cos(angle) * opts.radius * 0.5;
    const py = Math.sin(angle) * opts.radius * 0.5;
    const particle = scene.add.circle(px, py, 4, opts.innerColor, 0.8);
    particles.push(particle);
    container.add(particle);
  }

  // Glow pulse
  scene.tweens.add({
    targets: glow,
    scale: { from: 0.9, to: 1.2 },
    alpha: { from: 0.2, to: 0.5 },
    duration: 300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Core pulse
  scene.tweens.add({
    targets: core,
    scale: { from: 0.8, to: 1.1 },
    duration: 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Particle rotation
  scene.tweens.add({
    targets: container,
    angle: 360,
    duration: 1000,
    repeat: -1,
    ease: 'Linear',
  });

  return container;
}

/**
 * Stop charge effect and play release animation
 */
export function playFireballReleaseVisual(
  scene: Phaser.Scene,
  chargeContainer: Phaser.GameObjects.Container,
  dirX: number,
  dirY: number,
  options?: Partial<FireballCastVisualOptions>
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const x = chargeContainer.x;
  const y = chargeContainer.y;

  // Stop and destroy charge effect
  scene.tweens.killTweensOf(chargeContainer);
  scene.tweens.killTweensOf(chargeContainer.list);
  chargeContainer.destroy();

  // Play enhanced release effect
  createGlowEffect(scene, x, y, { ...opts, radius: opts.radius * 1.5 });
  createMagicRings(scene, x, y, { ...opts, radius: opts.radius * 1.3 });
  createOrbitingParticles(scene, x, y, { ...opts, particleCount: opts.particleCount * 2 });
  createMagicArrow(scene, x, y, dirX, dirY, { ...opts, radius: opts.radius * 1.5 });
}

// ========================================
// Internal helpers
// ========================================

/**
 * Create center glow effect
 */
function createGlowEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: FireballCastVisualOptions
): void {
  // Large soft glow
  const glow = scene.add.circle(x, y, opts.radius * 1.2, opts.innerColor, 0.4);
  glow.setDepth(98);

  // Quick pulse then fade
  scene.tweens.add({
    targets: glow,
    scale: { from: 0.5, to: 1.8 },
    alpha: { from: 0.5, to: 0 },
    duration: opts.duration * 0.8,
    ease: 'Cubic.easeOut',
    onComplete: () => glow.destroy(),
  });
}

/**
 * Create layered magic rings
 */
function createMagicRings(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: FireballCastVisualOptions
): void {
  const rings = [
    { color: opts.coreColor, radius: opts.radius * 0.3, delay: 0, thickness: 3 },
    { color: opts.innerColor, radius: opts.radius * 0.6, delay: 40, thickness: 2.5 },
    { color: opts.color, radius: opts.radius * 0.9, delay: 80, thickness: 2 },
  ];

  rings.forEach(({ color, radius, delay, thickness }) => {
    scene.time.delayedCall(delay, () => {
      // Create ring (hollow circle)
      const ring = scene.add.circle(x, y, radius * 0.3, 0x000000, 0);
      ring.setStrokeStyle(thickness, color, 1);
      ring.setDepth(100);

      // Expand animation
      scene.tweens.add({
        targets: ring,
        radius: radius * 2.5,
        alpha: 0,
        duration: opts.duration,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    });
  });

  // Center core flash
  const core = scene.add.circle(x, y, opts.radius * 0.2, opts.coreColor, 1);
  core.setDepth(101);

  scene.tweens.add({
    targets: core,
    scale: 1.5,
    alpha: 0,
    duration: opts.duration * 0.6,
    ease: 'Cubic.easeOut',
    onComplete: () => core.destroy(),
  });
}

/**
 * Create orbiting flame particles
 */
function createOrbitingParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: FireballCastVisualOptions
): void {
  const { color, innerColor, coreColor, particleCount, radius, duration } = opts;
  const colors = [color, innerColor, coreColor];

  for (let i = 0; i < particleCount; i++) {
    const startAngle = (Math.PI * 2 / particleCount) * i;
    const particleColor = colors[i % colors.length];
    const size = 3 + Math.random() * 3;

    // Circular particle
    const particle = scene.add.circle(x, y, size, particleColor, 0.9);
    particle.setDepth(100);

    // Compute rotation path
    const orbitRadius = radius * (0.4 + Math.random() * 0.3);
    const rotationAngle = Math.PI * 0.5 + Math.random() * Math.PI * 0.3; // Rotate 90-135 deg
    const finalAngle = startAngle + rotationAngle;

    // Final position (after rotation, expand outward)
    const finalRadius = radius * (1.5 + Math.random() * 0.5);
    const finalX = x + Math.cos(finalAngle) * finalRadius;
    const finalY = y + Math.sin(finalAngle) * finalRadius;

    // Mid position (on rotation orbit)
    const midX = x + Math.cos(startAngle + rotationAngle * 0.5) * orbitRadius;
    const midY = y + Math.sin(startAngle + rotationAngle * 0.5) * orbitRadius;

    // Two-phase animation: rotate then expand
    scene.tweens.add({
      targets: particle,
      x: midX,
      y: midY,
      duration: duration * 0.4,
      ease: 'Sine.easeOut',
      onComplete: () => {
        scene.tweens.add({
          targets: particle,
          x: finalX,
          y: finalY - 8, // Slight float up
          alpha: 0,
          scale: 0.3,
          duration: duration * 0.6,
          ease: 'Cubic.easeOut',
          onComplete: () => particle.destroy(),
        });
      },
    });
  }
}

/**
 * Create magic arrow direction indicator
 */
function createMagicArrow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  opts: FireballCastVisualOptions
): void {
  // Normalize direction
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len === 0) return;

  const nx = dirX / len;
  const ny = dirY / len;
  const angle = Math.atan2(ny, nx);

  // Arrow start position
  const startX = x + nx * opts.radius * 0.5;
  const startY = y + ny * opts.radius * 0.5;

  // Create triangle arrow
  const arrow = scene.add.graphics();
  arrow.setDepth(102);

  // Draw triangle
  const arrowSize = 12;
  arrow.fillStyle(opts.coreColor, 0.9);
  arrow.beginPath();
  arrow.moveTo(arrowSize, 0);           // Tip
  arrow.lineTo(-arrowSize * 0.5, -arrowSize * 0.5);  // Left rear
  arrow.lineTo(-arrowSize * 0.5, arrowSize * 0.5);   // Right rear
  arrow.closePath();
  arrow.fillPath();

  // Add glow edge
  arrow.lineStyle(2, opts.innerColor, 0.8);
  arrow.strokePath();

  arrow.setPosition(startX, startY);
  arrow.setRotation(angle);

  // Arrow fly-out animation
  const flyDistance = opts.radius * 2.5;
  const targetX = startX + nx * flyDistance;
  const targetY = startY + ny * flyDistance;

  scene.tweens.add({
    targets: arrow,
    x: targetX,
    y: targetY,
    alpha: 0,
    scale: 0.5,
    duration: opts.duration * 1.2,
    ease: 'Cubic.easeOut',
    onComplete: () => arrow.destroy(),
  });

  // Arrow trail particles
  createArrowTrail(scene, startX, startY, nx, ny, flyDistance, opts);
}

/**
 * Create arrow trail effect
 */
function createArrowTrail(
  scene: Phaser.Scene,
  startX: number,
  startY: number,
  nx: number,
  ny: number,
  distance: number,
  opts: FireballCastVisualOptions
): void {
  const trailCount = 5;
  const colors = [opts.color, opts.innerColor, opts.coreColor];

  for (let i = 0; i < trailCount; i++) {
    const delay = i * 30;
    const trailColor = colors[i % colors.length];

    scene.time.delayedCall(delay, () => {
      const trail = scene.add.circle(startX, startY, 4 - i * 0.5, trailColor, 0.7);
      trail.setDepth(101);

      const trailDistance = distance * (0.6 - i * 0.1);
      const targetX = startX + nx * trailDistance;
      const targetY = startY + ny * trailDistance;

      scene.tweens.add({
        targets: trail,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.2,
        duration: opts.duration * (0.8 - i * 0.1),
        ease: 'Cubic.easeOut',
        onComplete: () => trail.destroy(),
      });
    });
  }
}
