export const GameEvents = {
	toggleEditor: 'toggle-editor',
	registerSpell: 'register-spell',
	setEditorContext: 'set-editor-context', // For scene-specific editor restrictions
} as const

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents]


