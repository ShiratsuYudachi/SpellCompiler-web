export const GameEvents = {
	toggleEditor: 'toggle-editor',
} as const

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents]


