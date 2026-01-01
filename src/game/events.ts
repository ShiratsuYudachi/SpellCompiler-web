export const GameEvents = {
	toggleEditor: 'toggle-editor',
	registerSpell: 'register-spell',
} as const

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents]


