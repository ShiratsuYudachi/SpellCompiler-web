/** Cap avoids excessive GPU/memory use on very high-DPI displays. */
const MAX_RESOLUTION = 3

/**
 * Phaser internal canvas resolution multiplier (logical size stays 960×540).
 * FIT mode scales the canvas with CSS; higher values reduce blur when the window is large.
 * Match `devicePixelRatio` (capped) — forcing a much larger multiplier can make the whole
 * canvas downscale through FIT/browser filtering and look *more* blurry.
 * Pause/victory UI uses HTML and is unaffected; this mainly helps Phaser.Text + sprites.
 */
export function getPhaserCanvasResolution(): number {
	if (typeof window === 'undefined') return 1
	const dpr = window.devicePixelRatio
	if (!Number.isFinite(dpr) || dpr <= 0) return 1
	return Math.min(Math.max(1, dpr), MAX_RESOLUTION)
}
