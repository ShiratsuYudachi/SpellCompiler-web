/**
 * 战斗关卡难度配置
 */

export interface DifficultyConfig {
  chapter: number;
  level: number;
  minionCount: { min: number; max: number };
  minionHealth: { min: number; max: number };
  minionSpeed: { min: number; max: number };
  minionDamage: { min: number; max: number };
  spawnInterval: number;
  minionTypes: string[];
}

export const COMBAT_CONFIGS: DifficultyConfig[] = [
  // 第1章
  { chapter: 1, level: 1, minionCount: { min: 3, max: 5 }, minionHealth: { min: 30, max: 40 }, minionSpeed: { min: 80, max: 100 }, minionDamage: { min: 5, max: 8 }, spawnInterval: 3000, minionTypes: ['basic'] },
  { chapter: 1, level: 2, minionCount: { min: 4, max: 6 }, minionHealth: { min: 35, max: 45 }, minionSpeed: { min: 85, max: 105 }, minionDamage: { min: 6, max: 9 }, spawnInterval: 2800, minionTypes: ['basic', 'fast'] },
  { chapter: 1, level: 3, minionCount: { min: 4, max: 7 }, minionHealth: { min: 40, max: 50 }, minionSpeed: { min: 90, max: 110 }, minionDamage: { min: 7, max: 10 }, spawnInterval: 2600, minionTypes: ['basic', 'fast'] },
  { chapter: 1, level: 4, minionCount: { min: 5, max: 7 }, minionHealth: { min: 45, max: 55 }, minionSpeed: { min: 95, max: 115 }, minionDamage: { min: 8, max: 11 }, spawnInterval: 2500, minionTypes: ['basic', 'fast', 'turret'] },
  { chapter: 1, level: 5, minionCount: { min: 5, max: 8 }, minionHealth: { min: 50, max: 60 }, minionSpeed: { min: 100, max: 120 }, minionDamage: { min: 9, max: 12 }, spawnInterval: 2400, minionTypes: ['basic', 'fast', 'turret'] },
  { chapter: 1, level: 6, minionCount: { min: 6, max: 8 }, minionHealth: { min: 55, max: 65 }, minionSpeed: { min: 105, max: 125 }, minionDamage: { min: 10, max: 13 }, spawnInterval: 2300, minionTypes: ['basic', 'fast', 'turret'] },
  
  // 第2章
  { chapter: 2, level: 1, minionCount: { min: 5, max: 8 }, minionHealth: { min: 60, max: 80 }, minionSpeed: { min: 110, max: 130 }, minionDamage: { min: 12, max: 16 }, spawnInterval: 2200, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 2, minionCount: { min: 6, max: 9 }, minionHealth: { min: 70, max: 90 }, minionSpeed: { min: 120, max: 140 }, minionDamage: { min: 14, max: 18 }, spawnInterval: 2100, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 3, minionCount: { min: 6, max: 10 }, minionHealth: { min: 75, max: 95 }, minionSpeed: { min: 125, max: 145 }, minionDamage: { min: 15, max: 19 }, spawnInterval: 2000, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 4, minionCount: { min: 7, max: 10 }, minionHealth: { min: 80, max: 100 }, minionSpeed: { min: 130, max: 150 }, minionDamage: { min: 16, max: 20 }, spawnInterval: 1900, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 5, minionCount: { min: 7, max: 11 }, minionHealth: { min: 85, max: 105 }, minionSpeed: { min: 135, max: 155 }, minionDamage: { min: 17, max: 21 }, spawnInterval: 1800, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 6, minionCount: { min: 8, max: 11 }, minionHealth: { min: 90, max: 110 }, minionSpeed: { min: 140, max: 160 }, minionDamage: { min: 18, max: 22 }, spawnInterval: 1700, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 2, level: 7, minionCount: { min: 8, max: 12 }, minionHealth: { min: 95, max: 115 }, minionSpeed: { min: 145, max: 165 }, minionDamage: { min: 19, max: 23 }, spawnInterval: 1600, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  
  // 第3章
  { chapter: 3, level: 1, minionCount: { min: 8, max: 12 }, minionHealth: { min: 100, max: 130 }, minionSpeed: { min: 150, max: 170 }, minionDamage: { min: 20, max: 26 }, spawnInterval: 1500, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 2, minionCount: { min: 9, max: 13 }, minionHealth: { min: 110, max: 140 }, minionSpeed: { min: 155, max: 175 }, minionDamage: { min: 22, max: 28 }, spawnInterval: 1400, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 3, minionCount: { min: 9, max: 14 }, minionHealth: { min: 120, max: 150 }, minionSpeed: { min: 160, max: 180 }, minionDamage: { min: 24, max: 30 }, spawnInterval: 1300, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 4, minionCount: { min: 10, max: 14 }, minionHealth: { min: 130, max: 160 }, minionSpeed: { min: 165, max: 185 }, minionDamage: { min: 26, max: 32 }, spawnInterval: 1200, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 5, minionCount: { min: 10, max: 15 }, minionHealth: { min: 140, max: 170 }, minionSpeed: { min: 170, max: 190 }, minionDamage: { min: 28, max: 34 }, spawnInterval: 1100, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 6, minionCount: { min: 11, max: 15 }, minionHealth: { min: 150, max: 180 }, minionSpeed: { min: 175, max: 195 }, minionDamage: { min: 30, max: 36 }, spawnInterval: 1000, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 7, minionCount: { min: 11, max: 16 }, minionHealth: { min: 160, max: 190 }, minionSpeed: { min: 180, max: 200 }, minionDamage: { min: 32, max: 38 }, spawnInterval: 900, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
  { chapter: 3, level: 8, minionCount: { min: 12, max: 16 }, minionHealth: { min: 170, max: 200 }, minionSpeed: { min: 185, max: 205 }, minionDamage: { min: 34, max: 40 }, spawnInterval: 800, minionTypes: ['basic', 'fast', 'turret', 'teleport'] },
];

export function getCombatConfig(chapter: number, level: number): DifficultyConfig | null {
  return COMBAT_CONFIGS.find(c => c.chapter === chapter && c.level === level) || null;
}

export function getChapterLevels(chapter: number): DifficultyConfig[] {
  return COMBAT_CONFIGS.filter(c => c.chapter === chapter);
}
