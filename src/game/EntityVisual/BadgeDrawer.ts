import type Phaser from 'phaser'
import type { EntityRole } from './EntityVisualManager'

/**
 * BadgeDrawer
 *
 * Pure static helper — draws a role-specific symbol inside an entity's circle
 * using Phaser's Graphics API (no external assets required).
 *
 * All coordinates are absolute world positions (cx, cy = circle centre).
 * `s` = effective symbol half-size (derived from circle radius by caller).
 */
export class BadgeDrawer {
	static draw(
		g: Phaser.GameObjects.Graphics,
		role: EntityRole,
		cx: number,
		cy: number,
		radius: number
	): void {
		g.clear()
		switch (role) {
			case 'civilian': BadgeDrawer.drawCross(g, cx, cy, radius * 0.38); break
			case 'weak':     BadgeDrawer.drawX(g, cx, cy, radius * 0.42); break
			case 'guard':    BadgeDrawer.drawShield(g, cx, cy, radius * 0.48); break
			case 'target':   BadgeDrawer.drawCrosshair(g, cx, cy, radius * 0.52); break
			case 'enemy':    BadgeDrawer.drawExclaim(g, cx, cy, radius * 0.42); break
		}
	}

	// ── + cross — civilian / protected ─────────────────────────────────────────
	private static drawCross(
		g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number
	): void {
		const t = Math.max(2, s * 0.28)
		g.fillStyle(0xffffff, 0.70)
		g.fillRect(cx - t, cy - s, t * 2, s * 2) // vertical bar
		g.fillRect(cx - s, cy - t, s * 2, t * 2) // horizontal bar
	}

	// ── × X — weak enemy ───────────────────────────────────────────────────────
	private static drawX(
		g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number
	): void {
		g.lineStyle(2.5, 0xff9999, 0.90)
		g.beginPath()
		g.moveTo(cx - s, cy - s); g.lineTo(cx + s, cy + s)
		g.moveTo(cx + s, cy - s); g.lineTo(cx - s, cy + s)
		g.strokePath()
	}

	// ── ⬡ shield outline — guard ───────────────────────────────────────────────
	private static drawShield(
		g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number
	): void {
		// Roughly shield-shaped hexagon (wider at top, pointed at bottom)
		const pts: [number, number][] = [
			[cx,            cy - s],
			[cx + s * 0.72, cy - s * 0.35],
			[cx + s * 0.72, cy + s * 0.28],
			[cx,            cy + s],
			[cx - s * 0.72, cy + s * 0.28],
			[cx - s * 0.72, cy - s * 0.35],
		]
		g.lineStyle(2, 0xdd99ff, 0.90)
		g.beginPath()
		g.moveTo(pts[0][0], pts[0][1])
		for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1])
		g.closePath()
		g.strokePath()
	}

	// ── ⊕ crosshair — target ───────────────────────────────────────────────────
	private static drawCrosshair(
		g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number
	): void {
		const inner = s * 0.38
		g.lineStyle(2, 0xffcc00, 1.0)
		// inner ring
		g.beginPath()
		g.arc(cx, cy, inner, 0, Math.PI * 2)
		g.strokePath()
		// four tick lines
		g.beginPath()
		g.moveTo(cx,         cy - inner); g.lineTo(cx,         cy - s)
		g.moveTo(cx,         cy + inner); g.lineTo(cx,         cy + s)
		g.moveTo(cx - inner, cy);         g.lineTo(cx - s,     cy)
		g.moveTo(cx + inner, cy);         g.lineTo(cx + s,     cy)
		g.strokePath()
	}

	// ── ! exclamation mark — generic enemy ─────────────────────────────────────
	private static drawExclaim(
		g: Phaser.GameObjects.Graphics, cx: number, cy: number, s: number
	): void {
		const barW = Math.max(2, s * 0.26)
		g.fillStyle(0xffffff, 0.80)
		// vertical bar (top 65%)
		g.fillRect(cx - barW, cy - s, barW * 2, s * 1.3)
		// dot (bottom)
		g.fillCircle(cx, cy + s * 0.85, barW * 1.2)
	}
}
