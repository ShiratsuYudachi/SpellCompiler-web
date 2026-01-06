/**
 * 地形模板 - 8种障碍物布局
 * 障碍物用矩形表示: { x, y, width, height }
 */

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TerrainTemplate {
  id: number;
  name: string;
  obstacles: Obstacle[];
}

export const TERRAIN_TEMPLATES: TerrainTemplate[] = [
  // 模板1：十字分隔
  {
    id: 1,
    name: '十字分隔',
    obstacles: [
      { x: 400, y: 100, width: 160, height: 60 },  // 上横
      { x: 400, y: 380, width: 160, height: 60 },  // 下横
      { x: 200, y: 200, width: 60, height: 140 },  // 左竖
      { x: 700, y: 200, width: 60, height: 140 },  // 右竖
    ],
  },

  // 模板2：围栏迷宫
  {
    id: 2,
    name: '围栏迷宫',
    obstacles: [
      { x: 150, y: 150, width: 200, height: 40 },
      { x: 610, y: 150, width: 200, height: 40 },
      { x: 150, y: 350, width: 200, height: 40 },
      { x: 610, y: 350, width: 200, height: 40 },
      { x: 420, y: 220, width: 120, height: 100 },
    ],
  },

  // 模板3：中心堡垒
  {
    id: 3,
    name: '中心堡垒',
    obstacles: [
      { x: 380, y: 200, width: 200, height: 140 },  // 中心大块
      { x: 200, y: 120, width: 80, height: 80 },    // 左上
      { x: 680, y: 120, width: 80, height: 80 },    // 右上
      { x: 200, y: 340, width: 80, height: 80 },    // 左下
      { x: 680, y: 340, width: 80, height: 80 },    // 右下
    ],
  },

  // 模板4：对角通道
  {
    id: 4,
    name: '对角通道',
    obstacles: [
      { x: 150, y: 100, width: 120, height: 120 },
      { x: 300, y: 240, width: 120, height: 120 },
      { x: 540, y: 100, width: 120, height: 120 },
      { x: 690, y: 240, width: 120, height: 120 },
    ],
  },

  // 模板5：S型通道
  {
    id: 5,
    name: 'S型通道',
    obstacles: [
      { x: 100, y: 150, width: 400, height: 50 },
      { x: 460, y: 340, width: 400, height: 50 },
      { x: 420, y: 200, width: 80, height: 140 },
    ],
  },

  // 模板6：散落岩石
  {
    id: 6,
    name: '散落岩石',
    obstacles: [
      { x: 180, y: 120, width: 70, height: 70 },
      { x: 360, y: 180, width: 60, height: 60 },
      { x: 540, y: 140, width: 80, height: 80 },
      { x: 720, y: 200, width: 70, height: 70 },
      { x: 280, y: 320, width: 75, height: 75 },
      { x: 480, y: 360, width: 65, height: 65 },
      { x: 660, y: 340, width: 70, height: 70 },
    ],
  },

  // 模板7：环形竞技场
  {
    id: 7,
    name: '环形竞技场',
    obstacles: [
      { x: 200, y: 200, width: 60, height: 140 },   // 左
      { x: 700, y: 200, width: 60, height: 140 },   // 右
      { x: 380, y: 100, width: 200, height: 60 },   // 上
      { x: 380, y: 380, width: 200, height: 60 },   // 下
    ],
  },

  // 模板8：四角堡垒
  {
    id: 8,
    name: '四角堡垒',
    obstacles: [
      { x: 120, y: 100, width: 140, height: 100 },  // 左上
      { x: 700, y: 100, width: 140, height: 100 },  // 右上
      { x: 120, y: 340, width: 140, height: 100 },  // 左下
      { x: 700, y: 340, width: 140, height: 100 },  // 右下
    ],
  },
];

/**
 * 随机获取地形模板
 */
export function getRandomTerrain(): TerrainTemplate {
  const index = Math.floor(Math.random() * TERRAIN_TEMPLATES.length);
  return TERRAIN_TEMPLATES[index];
}

/**
 * 根据ID获取地形模板
 */
export function getTerrainById(id: number): TerrainTemplate | null {
  return TERRAIN_TEMPLATES.find(t => t.id === id) || null;
}
