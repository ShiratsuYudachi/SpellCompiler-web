import type { GameDomUiState, LevelHudState } from './gameDomUiTypes'

const DEFAULT_LEVEL_HUD: LevelHudState = {
	visible: false,
	hpLine: 'HP: 100/100',
	hpPercent: 1,
	castVisible: false,
	castLine: '',
	castWarning: false,
	taskTitle: 'OBJECTIVE',
	taskBody: '',
	minimapTitle: 'MINIMAP',
	controlsLeft: 'Tab  →  Toggle Editor\nESC  →  Pause Menu',
	spellLine: '',
	tutorialVisible: false,
	tutorialBody: '',
	survivalTimerVisible: false,
	survivalTimerLine: '',
	survivalTimerGreen: false,
	bossHud: null,
	banner: null,
}

let state: GameDomUiState = { levelHud: { ...DEFAULT_LEVEL_HUD } }
const listeners = new Set<() => void>()

export function subscribeGameDomUi(listener: () => void) {
	listeners.add(listener)
	return () => listeners.delete(listener)
}

export function getGameDomUiSnapshot(): GameDomUiState {
	return state
}

function notify() {
	listeners.forEach((l) => l())
}

export function resetLevelHud() {
	state = { levelHud: { ...DEFAULT_LEVEL_HUD } }
	notify()
}

export function setLevelHudVisible(visible: boolean) {
	state = { ...state, levelHud: { ...state.levelHud, visible } }
	notify()
}

export function patchLevelHud(partial: Partial<LevelHudState>) {
	state = { ...state, levelHud: { ...state.levelHud, ...partial } }
	notify()
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null

export function showDomBanner(text: string, color: string, fontSizePx: number, durationMs: number) {
	if (bannerTimer) {
		clearTimeout(bannerTimer)
		bannerTimer = null
	}
	patchLevelHud({ banner: { text, color, fontSizePx } })
	bannerTimer = setTimeout(() => {
		patchLevelHud({ banner: null })
		bannerTimer = null
	}, durationMs)
}

export function clearDomBanner() {
	if (bannerTimer) {
		clearTimeout(bannerTimer)
		bannerTimer = null
	}
	patchLevelHud({ banner: null })
}

/** Fixed top bar (clearer than world-follow Phaser.Text under FIT). */
export function setBossDomHud(healthLine: string, stateLine: string, barPercent: number) {
	patchLevelHud({
		bossHud: {
			healthLine,
			stateLine,
			barPercent,
		},
	})
}

export function clearBossDomHud() {
	patchLevelHud({ bossHud: null })
}
