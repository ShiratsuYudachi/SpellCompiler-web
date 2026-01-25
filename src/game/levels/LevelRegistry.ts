import type { ObjectiveConfig } from '../scenes/base/TerrainTypes'

export type LevelMeta = {
	key: string
	playerSpawnX: number
	playerSpawnY: number
	mapData?: number[][] // 0: 空地, 1: 墙壁, 2: 平台, 3: 危险区, 4: 目标点
	tileSize?: number
	objectives?: ObjectiveConfig[]
	initialSpellWorkflow?: {
		nodes: any[]
		edges: any[]
	}
	editorRestrictions?: RegExp
	allowedNodeTypes?: Array<'literal' | 'vector' | 'if' | 'customFunction' | 'applyFunc' | 'lambdaDef' | 'output' | 'dynamicFunction' | 'spellInput'>
	hints?: string[]
	logicReference?: Record<string, { gridX: number; gridY: number; action: string }>
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
