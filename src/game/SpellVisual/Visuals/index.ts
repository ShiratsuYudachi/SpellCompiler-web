/**
 * Visuals - 法术视觉效果统一导出
 */

// 传送特效
export {
  playTeleportVisual,
  playTeleportDisappear,
  playTeleportAppear,
  type TeleportVisualOptions,
} from './teleportVisual';

// 火球特效
export {
  playFireballCastVisual,
  playFireballChargeVisual,
  playFireballReleaseVisual,
  type FireballCastVisualOptions,
} from './fireballVisual';

// 伤害命中特效
export {
  playDamageHitVisual,
  type DamageHitVisualOptions,
} from './damageVisual';
