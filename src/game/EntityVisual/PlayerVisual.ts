import type Phaser from 'phaser'

/**
 * PlayerVisual — Knight Helmet (Option A)
 *
 * Five Graphics layers stacked on a pulsing glow:
 *   0. outerGlow  — large soft circle, slow azure pulse
 *   1. helmBase   — filled dome + chin guard + steel sheen
 *   2. helmRim    — gold outline stroke over the same paths
 *   3. visor      — dark T-slit + inner blue eye-glow
 *   4. crest      — small filled + stroked triangle on top
 *
 * All drawing is done in *local space* (relative to origin 0,0).
 * setPosition() simply moves each layer's (x, y), which Phaser
 * uses as the translation origin for the Graphics local space.
 *
 * Usage:
 *   this.playerVisual = new PlayerVisual(this, spawnX, spawnY)
 *   // in update:
 *   this.playerVisual.syncTo(body.x, body.y)
 *   // on shutdown:
 *   this.playerVisual.destroy()
 */
export class PlayerVisual {
	// ── Phaser objects ────────────────────────────────────────────────────────
	private outerGlow:  Phaser.GameObjects.Arc
	private helmBase:   Phaser.GameObjects.Graphics  // fill + sheen
	private helmRim:    Phaser.GameObjects.Graphics  // gold stroke
	private visor:      Phaser.GameObjects.Graphics  // T-slit
	private crest:      Phaser.GameObjects.Graphics  // top spike
	private pulseTween: Phaser.Tweens.Tween

	// Half-size of the helmet in pixels (tune here if body size changes)
	private static readonly S = 22

	constructor(scene: Phaser.Scene, x: number, y: number) {
		const S = PlayerVisual.S

		// ── Layer 0 — outer glow ────────────────────────────────────────────
		this.outerGlow = scene.add
			.circle(x, y, S * 1.9, 0x4488ff, 0.14)
			.setDepth(18)

		// ── Layer 1 — helmet fill + sheen ───────────────────────────────────
		this.helmBase = scene.add.graphics().setDepth(19).setPosition(x, y)
		PlayerVisual.drawHelmBase(this.helmBase, S)

		// ── Layer 2 — gold rim ───────────────────────────────────────────────
		this.helmRim = scene.add.graphics().setDepth(20).setPosition(x, y)
		PlayerVisual.drawHelmRim(this.helmRim, S)

		// ── Layer 3 — T-visor ────────────────────────────────────────────────
		this.visor = scene.add.graphics().setDepth(21).setPosition(x, y)
		PlayerVisual.drawVisor(this.visor, S)

		// ── Layer 4 — crest ──────────────────────────────────────────────────
		this.crest = scene.add.graphics().setDepth(22).setPosition(x, y)
		PlayerVisual.drawCrest(this.crest, S)

		// ── Pulse tween ──────────────────────────────────────────────────────
		this.pulseTween = scene.tweens.add({
			targets:  this.outerGlow,
			scaleX:   1.30,
			scaleY:   1.30,
			alpha:    0.07,
			duration: 1600,
			yoyo:     true,
			repeat:   -1,
			ease:     'Sine.easeInOut',
		})
	}

	// ── Public API ─────────────────────────────────────────────────────────────

	/** Call every frame: keeps visuals in sync with physics body position. */
	syncTo(x: number, y: number): void {
		this.outerGlow.setPosition(x, y)
		this.helmBase.setPosition(x, y)
		this.helmRim.setPosition(x, y)
		this.visor.setPosition(x, y)
		this.crest.setPosition(x, y)
	}

	/** Clean up all Phaser objects. Call from scene shutdown/restart. */
	destroy(): void {
		this.pulseTween.stop()
		this.outerGlow.destroy()
		this.helmBase.destroy()
		this.helmRim.destroy()
		this.visor.destroy()
		this.crest.destroy()
	}

	// ── Static drawers (local space, centred at 0,0) ───────────────────────────

	/**
	 * Helmet geometry reference  (S = half-width, typically 22)
	 *
	 *        ▲          ← crest tip at (0, domeTop − 10)
	 *      /‾‾‾\        ← dome arc from (−S, domeY) to (+S, domeY)
	 *     |  |  |       ← vertical visor slit
	 *     |═════|       ← horizontal visor slit (at slitY)
	 *     |_____|       ← chin guard, flat bottom at +chinBottom
	 */

	private static drawHelmBase(g: Phaser.GameObjects.Graphics, S: number): void {
		const domeY    = -S * 0.18   // dome arc centre (slightly above sprite centre)
		const chinBtm  = S * 0.82    // bottom of chin guard

		// — main helmet fill (dome + chin trapezoid) —
		g.fillStyle(0x1a3d7a, 1.0)
		g.beginPath()
		g.moveTo(-S, domeY)
		g.arc(0, domeY, S, Math.PI, 0, false)        // semicircle dome (top)
		g.lineTo(S * 0.82, chinBtm)                  // right taper
		g.lineTo(-S * 0.82, chinBtm)                 // bottom edge
		g.closePath()
		g.fillPath()

		// — darker cheek panels for depth —
		g.fillStyle(0x142e5e, 1.0)
		// right cheek
		g.fillTriangle(
			S * 0.45, domeY + S * 0.35,
			S,        domeY,
			S * 0.82, chinBtm,
		)
		// left cheek
		g.fillTriangle(
			-S * 0.45, domeY + S * 0.35,
			-S,        domeY,
			-S * 0.82, chinBtm,
		)

		// — top-left sheen arc —
		g.lineStyle(Math.max(2, S * 0.20), 0xffffff, 0.13)
		g.beginPath()
		g.arc(0, domeY, S * 0.58, Math.PI * 1.08, Math.PI * 1.72, false)
		g.strokePath()
	}

	private static drawHelmRim(g: Phaser.GameObjects.Graphics, S: number): void {
		const domeY   = -S * 0.18
		const chinBtm = S * 0.82

		// — outer gold outline —
		g.lineStyle(2.5, 0xddaa22, 1.0)
		g.beginPath()
		g.moveTo(-S, domeY)
		g.arc(0, domeY, S, Math.PI, 0, false)
		g.lineTo(S * 0.82, chinBtm)
		g.lineTo(-S * 0.82, chinBtm)
		g.closePath()
		g.strokePath()

		// — inner rim line (just inside the dome) —
		g.lineStyle(1, 0xcc8800, 0.45)
		g.beginPath()
		g.arc(0, domeY, S - 3, Math.PI, 0, false)
		g.strokePath()
	}

	private static drawVisor(g: Phaser.GameObjects.Graphics, S: number): void {
		const domeY   = -S * 0.18
		const slitY   = domeY + S * 0.30    // horizontal slit centre
		const vTop    = domeY - S * 0.60    // top of vertical slit
		const vBot    = slitY - S * 0.06    // vertical slit meets horizontal
		const vHalf   = S * 0.13            // half-width of vertical slit
		const hHalf   = S * 0.72            // half-width of horizontal slit
		const hThick  = S * 0.14            // half-height of horizontal slit

		// — dark fill —
		g.fillStyle(0x001133, 0.95)
		// vertical bar
		g.fillRect(-vHalf, vTop, vHalf * 2, vBot - vTop + hThick * 2)
		// horizontal bar
		g.fillRect(-hHalf, slitY - hThick, hHalf * 2, hThick * 2)

		// — eye glow (blue light inside horizontal slit) —
		g.fillStyle(0x55aaff, 0.55)
		g.fillRect(-hHalf + 2, slitY - hThick + 2, (hHalf - 2) * 2, (hThick - 2) * 2)

		// — fine gold border around slits —
		g.lineStyle(1, 0xcc9900, 0.70)
		g.strokeRect(-vHalf, vTop, vHalf * 2, vBot - vTop + hThick * 2)
		g.strokeRect(-hHalf, slitY - hThick, hHalf * 2, hThick * 2)
	}

	private static drawCrest(g: Phaser.GameObjects.Graphics, S: number): void {
		const domeY  = -S * 0.18
		const tip    = domeY - S - S * 0.45  // tip of crest
		const baseY  = domeY - S + S * 0.18  // base of crest (meets dome)
		const bHalf  = S * 0.32              // half-width at base

		// — fill —
		g.fillStyle(0x1a4499, 1.0)
		g.fillTriangle(-bHalf, baseY, bHalf, baseY, 0, tip)

		// — gold edge —
		g.lineStyle(1.8, 0xddaa22, 1.0)
		g.strokeTriangle(-bHalf, baseY, bHalf, baseY, 0, tip)

		// — small central ridge line —
		g.lineStyle(1, 0xffffff, 0.22)
		g.beginPath()
		g.moveTo(0, baseY - 2)
		g.lineTo(0, tip + 4)
		g.strokePath()
	}
}
