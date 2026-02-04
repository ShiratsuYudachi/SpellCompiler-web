/**
 * fireballVisual - 火球法术视觉效果
 * 魔法光环风格 - 多层光环、旋转粒子、魔法箭头
 */

import Phaser from 'phaser';

export interface FireballCastVisualOptions {
  /** 火焰主色 */
  color: number;
  /** 火焰次色（内焰） */
  innerColor: number;
  /** 核心色（最亮） */
  coreColor: number;
  /** 效果半径 */
  radius: number;
  /** 动画持续时间(ms) */
  duration: number;
  /** 粒子数量 */
  particleCount: number;
  /** 是否显示方向指示 */
  showDirection: boolean;
  /** 是否显示光晕 */
  showGlow: boolean;
}

const DEFAULT_OPTIONS: FireballCastVisualOptions = {
  color: 0xff6600,        // 橙色火焰
  innerColor: 0xffaa00,   // 金黄色
  coreColor: 0xffffcc,    // 亮黄白色核心
  radius: 35,
  duration: 350,
  particleCount: 10,
  showDirection: true,
  showGlow: true,
};

/**
 * 播放火球施法视觉效果（魔法光环风格）
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

  // 1. 中心光晕辉光
  if (opts.showGlow) {
    createGlowEffect(scene, x, y, opts);
  }

  // 2. 多层魔法光环
  createMagicRings(scene, x, y, opts);

  // 3. 旋转火焰粒子
  createOrbitingParticles(scene, x, y, opts);

  // 4. 魔法箭头方向指示
  if (opts.showDirection) {
    createMagicArrow(scene, x, y, dirX, dirY, opts);
  }
}

/**
 * 播放火球蓄力效果
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

  // 外层光晕
  const glow = scene.add.circle(0, 0, opts.radius * 0.8, opts.color, 0.3);
  container.add(glow);

  // 内圈 - 脉动的火焰核心
  const core = scene.add.circle(0, 0, opts.radius * 0.3, opts.coreColor, 0.9);
  container.add(core);

  // 旋转的粒子环
  const particles: Phaser.GameObjects.Arc[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i;
    const px = Math.cos(angle) * opts.radius * 0.5;
    const py = Math.sin(angle) * opts.radius * 0.5;
    const particle = scene.add.circle(px, py, 4, opts.innerColor, 0.8);
    particles.push(particle);
    container.add(particle);
  }

  // 光晕脉动
  scene.tweens.add({
    targets: glow,
    scale: { from: 0.9, to: 1.2 },
    alpha: { from: 0.2, to: 0.5 },
    duration: 300,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // 核心脉动
  scene.tweens.add({
    targets: core,
    scale: { from: 0.8, to: 1.1 },
    duration: 200,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // 粒子旋转
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
 * 停止蓄力效果并播放释放动画
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

  // 停止并销毁蓄力效果
  scene.tweens.killTweensOf(chargeContainer);
  scene.tweens.killTweensOf(chargeContainer.list);
  chargeContainer.destroy();

  // 播放增强版释放效果
  createGlowEffect(scene, x, y, { ...opts, radius: opts.radius * 1.5 });
  createMagicRings(scene, x, y, { ...opts, radius: opts.radius * 1.3 });
  createOrbitingParticles(scene, x, y, { ...opts, particleCount: opts.particleCount * 2 });
  createMagicArrow(scene, x, y, dirX, dirY, { ...opts, radius: opts.radius * 1.5 });
}

// ========================================
// 内部辅助函数
// ========================================

/**
 * 创建中心光晕辉光效果
 */
function createGlowEffect(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: FireballCastVisualOptions
): void {
  // 大范围柔和光晕
  const glow = scene.add.circle(x, y, opts.radius * 1.2, opts.innerColor, 0.4);
  glow.setDepth(98);

  // 快速脉冲然后消失
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
 * 创建多层魔法光环
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
      // 创建光环（空心圆）
      const ring = scene.add.circle(x, y, radius * 0.3, 0x000000, 0);
      ring.setStrokeStyle(thickness, color, 1);
      ring.setDepth(100);

      // 扩散动画
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

  // 中心核心闪光
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
 * 创建旋转火焰粒子
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

    // 圆形粒子
    const particle = scene.add.circle(x, y, size, particleColor, 0.9);
    particle.setDepth(100);

    // 计算旋转路径
    const orbitRadius = radius * (0.4 + Math.random() * 0.3);
    const rotationAngle = Math.PI * 0.5 + Math.random() * Math.PI * 0.3; // 旋转90-135度
    const finalAngle = startAngle + rotationAngle;

    // 最终位置（旋转后向外扩散）
    const finalRadius = radius * (1.5 + Math.random() * 0.5);
    const finalX = x + Math.cos(finalAngle) * finalRadius;
    const finalY = y + Math.sin(finalAngle) * finalRadius;

    // 中间位置（旋转轨道上）
    const midX = x + Math.cos(startAngle + rotationAngle * 0.5) * orbitRadius;
    const midY = y + Math.sin(startAngle + rotationAngle * 0.5) * orbitRadius;

    // 两段动画：先旋转，后扩散
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
          y: finalY - 8, // 轻微上飘
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
 * 创建魔法箭头方向指示
 */
function createMagicArrow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  dirX: number,
  dirY: number,
  opts: FireballCastVisualOptions
): void {
  // 归一化方向
  const len = Math.sqrt(dirX * dirX + dirY * dirY);
  if (len === 0) return;

  const nx = dirX / len;
  const ny = dirY / len;
  const angle = Math.atan2(ny, nx);

  // 箭头起始位置
  const startX = x + nx * opts.radius * 0.5;
  const startY = y + ny * opts.radius * 0.5;

  // 创建三角形箭头
  const arrow = scene.add.graphics();
  arrow.setDepth(102);

  // 绘制三角形
  const arrowSize = 12;
  arrow.fillStyle(opts.coreColor, 0.9);
  arrow.beginPath();
  arrow.moveTo(arrowSize, 0);           // 尖端
  arrow.lineTo(-arrowSize * 0.5, -arrowSize * 0.5);  // 左后
  arrow.lineTo(-arrowSize * 0.5, arrowSize * 0.5);   // 右后
  arrow.closePath();
  arrow.fillPath();

  // 添加发光边缘
  arrow.lineStyle(2, opts.innerColor, 0.8);
  arrow.strokePath();

  arrow.setPosition(startX, startY);
  arrow.setRotation(angle);

  // 箭头飞出动画
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

  // 箭头拖尾粒子
  createArrowTrail(scene, startX, startY, nx, ny, flyDistance, opts);
}

/**
 * 创建箭头拖尾效果
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
