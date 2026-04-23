/**
 * Bosstext
 */

export interface BossConfig {
  // text
  maxHealth: number;
  
  // text
  moveSpeed: number;
  detectionRange: number;
  attackRange: number;
  stopDistance: number;
  
  // text
  attackDamage: number;
  attackCooldown: number;
  criticalMultiplier: number;
  
  // text
  phases: PhaseConfig[];
}

export interface PhaseConfig {
  phaseNumber: number;
  healthThreshold: number;      // text (0.0-1.0)
  damageMultiplier: number;      // text
  moveSpeedMultiplier: number;   // text
  attackIntervalMultiplier: number; // text
  invincibleDuration: number;    // text(sec)
  screenShake?: boolean;         // text
  shakeIntensity?: number;       // text
  shakeDuration?: number;        // text(sec)
}

/**
 * textBossconfig - text
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
