/**
 * Boss配置定义
 */

export interface BossConfig {
  // 基础属性
  maxHealth: number;
  
  // 移动配置
  moveSpeed: number;
  detectionRange: number;
  attackRange: number;
  stopDistance: number;
  
  // 攻击配置
  attackDamage: number;
  attackCooldown: number;
  criticalMultiplier: number;
  
  // 阶段配置
  phases: PhaseConfig[];
}

export interface PhaseConfig {
  phaseNumber: number;
  healthThreshold: number;      // 血量百分比 (0.0-1.0)
  damageMultiplier: number;      // 伤害倍率
  moveSpeedMultiplier: number;   // 移速倍率
  attackIntervalMultiplier: number; // 攻击间隔倍率
  invincibleDuration: number;    // 转阶段无敌时间（秒）
  screenShake?: boolean;         // 是否屏幕震动
  shakeIntensity?: number;       // 震动强度
  shakeDuration?: number;        // 震动时长（秒）
}

/**
 * 默认Boss配置 - 用于测试
 */
export const defaultBossConfig: BossConfig = {
  maxHealth: 1000,
  moveSpeed: 100,
  detectionRange: 400,
  attackRange: 150,
  stopDistance: 120,
  attackDamage: 30,
  attackCooldown: 2.0,
  criticalMultiplier: 2.0,
  
  phases: [
    {
      phaseNumber: 1,
      healthThreshold: 1.0,
      damageMultiplier: 1.0,
      moveSpeedMultiplier: 1.0,
      attackIntervalMultiplier: 1.0,
      invincibleDuration: 0,
    },
    {
      phaseNumber: 2,
      healthThreshold: 0.6,
      damageMultiplier: 1.5,
      moveSpeedMultiplier: 1.2,
      attackIntervalMultiplier: 0.8,
      invincibleDuration: 2.0,
      screenShake: true,
      shakeIntensity: 5,
      shakeDuration: 1.0,
    },
    {
      phaseNumber: 3,
      healthThreshold: 0.3,
      damageMultiplier: 2.0,
      moveSpeedMultiplier: 1.5,
      attackIntervalMultiplier: 0.6,
      invincibleDuration: 3.0,
      screenShake: true,
      shakeIntensity: 10,
      shakeDuration: 1.5,
    },
  ],
};
