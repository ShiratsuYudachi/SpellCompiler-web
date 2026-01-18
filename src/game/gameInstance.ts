import type Phaser from 'phaser'

let gameInstance: Phaser.Game | null = null

export function setGameInstance(game: Phaser.Game | null) {
	gameInstance = game
}

export function getGameInstance() {
	return gameInstance
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

