export const GameEvents = {
	toggleEditor: 'toggle-editor',
	togglePause: 'toggle-pause',
	showVictory: 'show-victory',
	setEditorContext: 'set-editor-context', // For scene-specific editor restrictions
	/** Main menu uses React DOM text (same crisp rendering as Pause); Phaser scene only draws background */
	uiMainMenu: 'ui-main-menu',
	uiLevelSelect: 'ui-level-select',
	uiSaveSelect: 'ui-save-select',
	dismissTutorial: 'dismiss-tutorial',
} as const

export type GameEventName = (typeof GameEvents)[keyof typeof GameEvents]


