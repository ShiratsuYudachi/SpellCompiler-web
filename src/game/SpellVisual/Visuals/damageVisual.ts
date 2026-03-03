/**
 * damageVisual - 伤害命中视觉效果
 * 冲击闪光、冲击波环、能量碎片迸射、浮动伤害数字
 * 风格与 fireballVisual / teleportVisual 保持一致（Phaser tween + 圆形粒子）
 */

import Phaser from 'phaser';

export interface DamageHitVisualOptions {
  /** 冲击主色（default: 红色） */
  color?: number;
  /** 内层冲击色 */
  innerColor?: number;
  /** 核心闪光色（最亮） */
  coreColor?: number;
  /** 效果半径 */
  radius?: number;
  /** 动画总时长(ms) */
  duration?: number;
  /** 迸射粒子数量 */
  particleCount?: number;
  /** 是否显示浮动伤害数字 */
  showNumber?: boolean;
}

const DEFAULT_OPTIONS: Required<DamageHitVisualOptions> = {
  color: 0xff3344,       // 红色冲击
  innerColor: 0xff8844,  // 橙红内层
  coreColor: 0xffddaa,   // 亮黄白核心闪光
  radius: 22,
  duration: 280,
  particleCount: 7,
  showNumber: true,
};

/**
 * 播放伤害命中视觉效果
 * @param scene   Phaser 场景
 * @param x       命中点 X
 * @param y       命中点 Y
 * @param amount  伤害数值（用于浮动数字）
 * @param options 可选配置
 */
export function playDamageHitVisual(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  options?: DamageHitVisualOptions
): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // 1. 冲击核心闪光（快速扩散的实心圆）
  createImpactFlash(scene, x, y, opts);

  // 2. 冲击波扩散环
  createShockwaveRings(scene, x, y, opts);

  // 3. 能量碎片迸射（向外辐射粒子）
  createEnergyBurst(scene, x, y, opts);

  // 4. 浮动伤害数字
  if (opts.showNumber && amount > 0) {
    createFloatingDamageNumber(scene, x, y, amount, opts);
  }
}

// ========================================
// 内部辅助函数
// ========================================

/**
 * 冲击核心闪光：双层实心圆，快速扩散消失
 */
function createImpactFlash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: Required<DamageHitVisualOptions>
): void {
  // 白核（最内层）
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

  // 外层红色光晕
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
 * 冲击波扩散环：两道空心环向外扩展
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
 * 能量碎片迸射：小粒子从命中点向四周飞散
 */
function createEnergyBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  opts: Required<DamageHitVisualOptions>
): void {
  const colors = [opts.color, opts.innerColor, opts.coreColor];

  for (let i = 0; i < opts.particleCount; i++) {
    // 均匀分布 + 随机扰动，避免完全对称显得机械
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
 * 浮动伤害数字："-X" 从命中点上方飘起并淡出
 * 带一层黑色阴影增强可读性
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
  const drift = (Math.random() - 0.5) * 12; // 轻微水平偏移，多个伤害数字不重叠

  // 阴影层
  const shadow = scene.add
    .text(x + 1, startY + 1, label, {
      fontSize: '15px',
      color: '#220000',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setDepth(101)
    .setAlpha(0.55);

  // 主数字
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
