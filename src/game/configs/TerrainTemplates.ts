/**
 * terrain templates - 8text
 * text: { x, y, width, height }
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
  // template1:Cross Split
  {
    id: 1,
    name: 'Cross Split',
    obstacles: [
      { x: 400, y: 100, width: 160, height: 60 },  // top horizontal
      { x: 400, y: 380, width: 160, height: 60 },  // bottom horizontal
      { x: 200, y: 200, width: 60, height: 140 },  // left vertical
      { x: 700, y: 200, width: 60, height: 140 },  // right vertical
    ],
  },

  // template2:Fence Maze
  {
    id: 2,
    name: 'Fence Maze',
    obstacles: [
      { x: 150, y: 150, width: 200, height: 40 },
      { x: 610, y: 150, width: 200, height: 40 },
      { x: 150, y: 350, width: 200, height: 40 },
      { x: 610, y: 350, width: 200, height: 40 },
      { x: 420, y: 220, width: 120, height: 100 },
    ],
  },

  // template3:Central Fortress
  {
    id: 3,
    name: 'Central Fortress',
    obstacles: [
      { x: 380, y: 200, width: 200, height: 140 },  // text
      { x: 200, y: 120, width: 80, height: 80 },    // top-left
      { x: 680, y: 120, width: 80, height: 80 },    // top-right
      { x: 200, y: 340, width: 80, height: 80 },    // bottom-left
      { x: 680, y: 340, width: 80, height: 80 },    // bottom-right
    ],
  },

  // template4:Diagonal Corridor
  {
    id: 4,
    name: 'Diagonal Corridor',
    obstacles: [
      { x: 150, y: 100, width: 120, height: 120 },
      { x: 300, y: 240, width: 120, height: 120 },
      { x: 540, y: 100, width: 120, height: 120 },
      { x: 690, y: 240, width: 120, height: 120 },
    ],
  },

  // template5:S Corridor
  {
    id: 5,
    name: 'S Corridor',
    obstacles: [
      { x: 100, y: 150, width: 400, height: 50 },
      { x: 460, y: 340, width: 400, height: 50 },
      { x: 420, y: 200, width: 80, height: 140 },
    ],
  },

  // template6:Scattered Rocks
  {
    id: 6,
    name: 'Scattered Rocks',
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

  // template7:Ring Arena
  {
    id: 7,
    name: 'Ring Arena',
    obstacles: [
      { x: 200, y: 200, width: 60, height: 140 },   // left
      { x: 700, y: 200, width: 60, height: 140 },   // right
      { x: 380, y: 100, width: 200, height: 60 },   // top
      { x: 380, y: 380, width: 200, height: 60 },   // bottom
    ],
  },

  // template8:Four-Corner Fortress
  {
    id: 8,
    name: 'Four-Corner Fortress',
    obstacles: [
      { x: 120, y: 100, width: 140, height: 100 },  // top-left
      { x: 700, y: 100, width: 140, height: 100 },  // top-right
      { x: 120, y: 340, width: 140, height: 100 },  // bottom-left
      { x: 700, y: 340, width: 140, height: 100 },  // bottom-right
    ],
  },
];

/**
 * get random terrain template
 */
export function getRandomTerrain(): TerrainTemplate {
  const index = Math.floor(Math.random() * TERRAIN_TEMPLATES.length);
  return TERRAIN_TEMPLATES[index];
}

/**
 * byIDget terrain template
 */
export function getTerrainById(id: number): TerrainTemplate | null {
  return TERRAIN_TEMPLATES.find(t => t.id === id) || null;
}
