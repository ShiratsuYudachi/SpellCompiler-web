export type EditorContext = {
	sceneKey?: string
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

export function subscribeEditorContext(listener: (context: EditorContext) => void): () => void {
	listeners.add(listener)
	// Immediately call with current value
	listener(editorContext)
	// Return unsubscribe function
	return () => {
		listeners.delete(listener)
	}
}
