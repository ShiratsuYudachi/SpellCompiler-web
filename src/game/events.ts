export const GameEvents = {
	toggleEditor: 'toggle-editor',
	togglePause: 'toggle-pause',
	showVictory: 'show-victory',
	setEditorContext: 'set-editor-context', // For scene-specific editor restrictions
} as const

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents]


