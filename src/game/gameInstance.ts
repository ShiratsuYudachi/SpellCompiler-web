import type Phaser from 'phaser'

let gameInstance: Phaser.Game | null = null

export function setGameInstance(game: Phaser.Game | null) {
	gameInstance = game
}

export function getGameInstance() {
	return gameInstance
}

/**
 * Switch scenes when the caller is outside any Phaser Scene (e.g. React DOM).
 * `Phaser.Game#scene` is SceneManager; `SceneManager#start()` does not stop the
 * scene that is currently running. In-scene `this.scene.start(next)` queues
 * stop(current) + start(next). This helper matches that behaviour.
 */
export function replacePhaserScene(fromKey: string, toKey: string, data?: object) {
	const game = gameInstance
	if (!game) return
	game.scene.stop(fromKey)
	game.scene.start(toKey, data)
}

/**
 * Running or paused foreground scene (e.g. level). `getScenes(true)` only lists RUNNING
 * scenes, so a paused level disappears from that list — use this for pause/editor context.
 */
export function getForegroundSceneKey(game: Phaser.Game): string | undefined {
	const scenes = game.scene.getScenes(false).filter((s) => s.sys.isActive() || s.sys.isPaused())
	if (scenes.length === 0) return undefined
	return scenes[scenes.length - 1].scene.key
}

// Editor context management
export type EditorContext = { 
	sceneKey?: string
	refreshId?: number // Force refresh when restrictions change
} | null

let editorContext: EditorContext = null
const listeners = new Set<(context: EditorContext) => void>()

export function setEditorContext(context: EditorContext) {
	editorContext = context
	listeners.forEach(listener => listener(context))
}

export function getEditorContext(): EditorContext {
	return editorContext
}

export function forceRefreshEditor() {
	if (editorContext) {
		setEditorContext({ ...editorContext, refreshId: Date.now() })
	}
}

export function subscribeEditorContext(listener: (context: EditorContext) => void): () => void {
	listeners.add(listener)
	// Immediately call with current value
	listener(editorContext)
	// Return unsubscribe function
	return () => {
		listeners.delete(listener)
	}
}

