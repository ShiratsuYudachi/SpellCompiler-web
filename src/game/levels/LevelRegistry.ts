import type { ObjectiveConfig } from '../scenes/base/TerrainTypes'

export type LevelMeta = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	mapData?: number[][] // 0: empty, 1: wall, 2: platform, 3: hazard, 4: objective
	tileSize?: number
	objectives?: ObjectiveConfig[]
	initialSpellWorkflow?: {
		nodes: any[]
		edges: any[]
	}
	/** Complete working answer for this level — used as structural reference by the Vibe AI (Full Regen). */
	answerSpellWorkflow?: {
		nodes: any[]
		edges: any[]
	}
	editorRestrictions?: RegExp
	allowedNodeTypes?: Array<'literal' | 'vector' | 'if' | 'customFunction' | 'applyFunc' | 'lambdaDef' | 'functionOut' | 'output' | 'dynamicFunction' | 'spellInput'>
	hints?: string[]
	logicReference?: Record<string, { gridX: number; gridY: number; action: string }>
	maxSpellCasts?: number   // Max spell casts for this level; undefined = no limit
}

class LevelRegistry {
	private levels: Map<string, LevelMeta> = new Map()

	register(meta: LevelMeta) {
		this.levels.set(meta.key, meta)
	}

	get(key: string): LevelMeta | undefined {
		return this.levels.get(key)
	}

	getAll(): LevelMeta[] {
		// Return sorted by level number if possible, assuming keys are like "Level1", "Level2"
		return Array.from(this.levels.values()).sort((a, b) => {
			const numA = parseInt(a.key.replace('Level', '')) || 0
			const numB = parseInt(b.key.replace('Level', '')) || 0
			return numA - numB
		})
	}
}

export const levelRegistry = new LevelRegistry()
