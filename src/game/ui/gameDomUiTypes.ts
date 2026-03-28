export type BossHudDom = {
	healthLine: string
	stateLine: string
	barPercent: number
}

export type LevelHudState = {
	visible: boolean
	hpLine: string
	hpPercent: number
	castVisible: boolean
	castLine: string
	castWarning: boolean
	taskTitle: string
	taskBody: string
	minimapTitle: string
	controlsLeft: string
	spellLine: string
	tutorialVisible: boolean
	tutorialBody: string
	survivalTimerVisible: boolean
	survivalTimerLine: string
	survivalTimerGreen: boolean
	bossHud: BossHudDom | null
	banner: null | { text: string; color: string; fontSizePx: number }
}

export type GameDomUiState = {
	levelHud: LevelHudState
}
