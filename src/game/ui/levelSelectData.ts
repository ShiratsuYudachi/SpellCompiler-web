export type LevelEntry = {
	num: number
	key: string
	name: string
	category: string
}

export const CATEGORY_COLORS: Record<string, string> = {
	Basics: '#4a90e2',
	Deflection: '#e2a94a',
	Filter: '#a94ae2',
	forEach: '#4ae27a',
	map: '#e24a7a',
	Spatial: '#4ae2d0',
	Combo: '#e2e24a',
}

/** Same list as former LevelSelectInterface */
export const LEVEL_GRID: LevelEntry[] = [
	{ num: 1, key: 'Level1', name: 'Move', category: 'Basics' },
	{ num: 2, key: 'Level2', name: 'Attack', category: 'Basics' },
	{ num: 3, key: 'Level3', name: 'Event System', category: 'Basics' },
	{ num: 4, key: 'Level4', name: 'Custom Event', category: 'Basics' },
	{ num: 5, key: 'Level5', name: 'Treasure Hunt', category: 'Basics' },
	{ num: 6, key: 'Level6', name: 'Heavy Ball', category: 'Basics' },
	{ num: 7, key: 'Level7', name: 'Sort & Throw', category: 'Basics' },
	{ num: 8, key: 'Level8', name: 'Reach Goal', category: 'Basics' },
	{ num: 9, key: 'Level9', name: 'Only Red', category: 'Filter' },
	{ num: 10, key: 'Level10', name: 'Guided Strike', category: 'Filter' },
	{ num: 11, key: 'Level11', name: 'Max Threat', category: 'Filter' },
	{ num: 12, key: 'Level12', name: 'Sweep', category: 'forEach' },
	{ num: 13, key: 'Level13', name: 'Precision', category: 'forEach' },
	{ num: 14, key: 'Level14', name: 'Strike', category: 'forEach' },
	{ num: 15, key: 'Level15', name: 'Guided Balls', category: 'map' },
	{ num: 16, key: 'Level16', name: 'Reactor', category: 'map' },
	{ num: 17, key: 'Level17', name: 'Classified', category: 'map' },
	{ num: 18, key: 'Level18', name: 'Close Sweep', category: 'Spatial' },
	{ num: 19, key: 'Level19', name: 'Lockdown', category: 'Spatial' },
	{ num: 20, key: 'Level20', name: 'Combo I', category: 'Combo' },
]
