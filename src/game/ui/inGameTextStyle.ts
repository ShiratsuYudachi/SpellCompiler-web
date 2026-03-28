import type Phaser from 'phaser'
import { getPhaserCanvasResolution } from '../canvasResolution'

/** Single sans-serif stack for menus, HUD, and world labels */
export const IN_GAME_FONT =
	'"Segoe UI", "Helvetica Neue", system-ui, -apple-system, sans-serif'

/** Same stack for React `fontFamily` (no extra quotes) */
export const CSS_FONT_STACK = 'Segoe UI, Helvetica Neue, system-ui, -apple-system, sans-serif'

/**
 * Shared with Pause/Victory/main-menu overlays: native DOM text rasterization (clearer than Phaser.Text on a scaled canvas).
 */
export const crispDomTextRootStyle = {
	fontFamily: CSS_FONT_STACK,
	WebkitFontSmoothing: 'antialiased' as const,
	MozOsxFontSmoothing: 'grayscale' as const,
	textRendering: 'geometricPrecision' as const,
}

/** Panel chrome (matches menu overlays: dark neutral) */
export const panelBg = 0x1a1a1e
export const panelBorder = 0x3a3d46
export const panelTitleStrip = 0x2a2d35

/**
 * Phaser.Text draws to its own internal canvas; this is separate from Game `resolution`.
 * Keep this aligned with `getPhaserCanvasResolution()` so text textures match the game backing store.
 */
function withTextRaster<T extends Phaser.Types.GameObjects.Text.TextStyle>(style: T): T {
	return { ...style, resolution: getPhaserCanvasResolution() }
}

const softShadow: Phaser.Types.GameObjects.Text.TextShadow = {
	offsetX: 1,
	offsetY: 2,
	color: '#000000',
	blur: 2,
	stroke: false,
	fill: true,
}

/** Reuse for custom-colored world labels */
export const TEXT_SHADOW_SOFT = softShadow

/** Merge into ad-hoc TextStyle objects (levels, boss skills) for consistent sharpness */
export function withTextRasterResolution(
	style: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster(style)
}

export function hudRootStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '15px',
		color: '#f2f2f2',
		lineSpacing: 5,
		shadow: softShadow,
	})
}

export function hpLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '14px',
		color: '#ffffff',
		fontStyle: 'bold',
		shadow: softShadow,
	})
}

export function spellCastCounterStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '14px',
		color: '#e8dcc8',
		fontStyle: 'bold',
		shadow: softShadow,
	})
}

export const spellCastColorNormal = '#e8dcc8'
export const spellCastColorWarning = '#e88878'

export function taskPanelTitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '13px',
		color: '#e8e8e8',
		fontStyle: 'bold',
		letterSpacing: 1,
	})
}

export function taskBodyStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '14px',
		color: '#ececec',
		lineSpacing: 8,
	})
}

export function minimapLabelStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '11px',
		color: '#c8c8c8',
		fontStyle: 'bold',
		letterSpacing: 1.2,
	})
}

export function controlsTitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '12px',
		color: '#e4e4e4',
		fontStyle: 'bold',
		letterSpacing: 1,
	})
}

export function controlsBodyStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '13px',
		color: '#d6d6d6',
		lineSpacing: 7,
	})
}

/** Tutorial card body — no fill on text (card drawn separately) */
export function tutorialOverlayStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '18px',
		color: '#f0f0f0',
		align: 'center',
		wordWrap: { width: 600 },
		lineSpacing: 10,
		shadow: {
			offsetX: 0,
			offsetY: 1,
			color: '#000000',
			blur: 4,
			stroke: false,
			fill: true,
		},
	})
}

// --- Phaser menus (main / level select / save) ---

export function menuMainTitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '64px',
		color: '#ffffff',
		fontStyle: 'bold',
		shadow: softShadow,
	})
}

export function menuSubtitleStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '24px',
		color: '#c4c8d0',
		shadow: softShadow,
	})
}

export function menuScreenTitleStyle(fontSize: string): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color: '#ffffff',
		fontStyle: 'bold',
		shadow: softShadow,
	})
}

export function menuButtonLabelStyle(fontSize: string): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color: '#ffffff',
		fontStyle: 'bold',
	})
}

export function menuFooterHintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '14px',
		color: '#9098a8',
	})
}

/** Longer helper lines on menu screens (e.g. save select footer) */
export function menuParagraphStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '16px',
		color: '#9098a8',
	})
}

export function menuTinyHintStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '11px',
		color: '#6a7078',
	})
}

export function menuVersionStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '13px',
		color: '#5a6270',
	})
}

// --- World / object-attached labels (levels) ---

export function worldFloatingTextStyle(
	fontSize: string,
	color: string,
	opts?: { bold?: boolean; align?: 'left' | 'center' | 'right' },
): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color,
		fontStyle: opts?.bold ? 'bold' : undefined,
		align: opts?.align,
		shadow: softShadow,
	})
}

export function worldBattleTimerStyle(): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize: '24px',
		color: '#f0f0f0',
		fontStyle: 'bold',
		backgroundColor: '#1a1a1e',
		padding: { x: 12, y: 6 },
		shadow: softShadow,
	})
}

export function entityNameplateStyle(fontSize: string, color: string): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color,
		shadow: softShadow,
	})
}

export function bossHudLineStyle(fontSize: string, color: string): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color,
		shadow: softShadow,
	})
}

/** Large warning / announcement (boss skills) */
export function bossBannerStyle(fontSize: string, color: string): Phaser.Types.GameObjects.Text.TextStyle {
	return withTextRaster({
		fontFamily: IN_GAME_FONT,
		fontSize,
		color,
		fontStyle: 'bold',
		shadow: {
			offsetX: 0,
			offsetY: 2,
			color: '#000000',
			blur: 6,
			stroke: false,
			fill: true,
		},
	})
}
