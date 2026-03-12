import type Phaser from 'phaser'
import { BadgeDrawer } from './BadgeDrawer'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EntityRole = 'civilian' | 'weak' | 'guard' | 'target' | 'enemy'

export interface EntityVisualConfig {
	role: EntityRole
	x: number
	y: number
	/** Radius of the main body circle (pixels). */
	radius: number
	/** Primary fill colour (0xRRGGBB). */
	bodyColor: number
	/** Maximum HP — used to compute arc percentage. */
	maxHP: number
	/** Override the displayed role label; defaults to role name in CAPS. */
	labelText?: string
}

interface EntityVisualState {
	config: EntityVisualConfig
	/** Large faint glow behind the body — animated by pulse tween. */
	outerGlow:   Phaser.GameObjects.Arc
	/** Main filled circle. */
	innerCircle: Phaser.GameObjects.Arc
	/** Role badge drawn with Graphics (redrawn once on register). */
	badge:       Phaser.GameObjects.Graphics
	/** Radial HP arc — cleared and redrawn every update call. */
	hpRing:      Phaser.GameObjects.Graphics
	/** Text label showing role + current HP. */
	label:       Phaser.GameObjects.Text
	/** Pulse tween on the outer glow (null for roles with no pulse). */
	tween:       Phaser.Tweens.Tween | null
}

// ─── Pulse configuration per role ────────────────────────────────────────────

interface PulseConfig { scale: number; alpha: number; duration: number }

const PULSE_CFG: Record<EntityRole, PulseConfig> = {
	civilian: { scale: 0.88, alpha: 0.25, duration: 2400 },
	weak:     { scale: 0.85, alpha: 0.50, duration: 1300 },
	guard:    { scale: 0.90, alpha: 0.60, duration: 1800 },
	target:   { scale: 1.22, alpha: 0.75, duration: 640  },
	enemy:    { scale: 0.88, alpha: 0.55, duration: 1500 },
}

const ROLE_LABEL: Record<EntityRole, string> = {
	civilian: 'CIVILIAN',
	weak:     'WEAK',
	guard:    'GUARD',
	target:   'TARGET',
	enemy:    'ENEMY',
}

// ─── HP ring style ────────────────────────────────────────────────────────────

/** Gap (px) between the body circle edge and the HP ring arc. */
const HP_RING_GAP = 9
/** Stroke width of the HP ring. */
const HP_RING_WIDTH = 3

function hpColor(pct: number): number {
	if (pct > 0.60) return 0x44ee66 // green
	if (pct > 0.30) return 0xffcc00 // yellow
	return 0xff3322                  // red
}

// ─── EntityVisualManager ──────────────────────────────────────────────────────

/**
 * EntityVisualManager
 *
 * Manages rich visual representations for game entities.
 * Each registered entity gets five stacked layers:
 *
 *   1. outerGlow    — large faint circle, animated by pulse tween  (Option 3)
 *   2. innerCircle  — main body circle with thin white outline
 *   3. badge        — role-specific Graphics symbol                 (Option 4)
 *   4. hpRing       — radial arc HP gauge, redrawn every frame     (Option 5)
 *   5. label        — text: "<ROLE>  <hp>"
 *
 * Usage:
 *   const visuals = new EntityVisualManager(this)          // in scene
 *   visuals.register(eid, { role, x, y, radius, ... })    // on spawn
 *   visuals.update(eid, Health.current[eid])              // each frame
 *   visuals.destroy(eid)                                  // on death
 *   visuals.destroyAll()                                  // on scene shutdown
 */
export class EntityVisualManager {
	private scene: Phaser.Scene
	private visuals = new Map<number, EntityVisualState>()

	constructor(scene: Phaser.Scene) {
		this.scene = scene
	}

	// ── Public API ─────────────────────────────────────────────────────────────

	/** Create all visual layers for one entity. */
	register(eid: number, config: EntityVisualConfig): void {
		if (this.visuals.has(eid)) this.destroy(eid) // safe re-register

		const { role, x, y, radius, bodyColor, maxHP } = config

		// ── Layer 1: outer glow ──────────────────────────────────────────────
		const outerGlow = this.scene.add
			.circle(x, y, radius * 1.65, bodyColor, 0.13)
			.setDepth(10)

		// ── Layer 2: inner circle (full solid + rim) ─────────────────────────
		const fillAlpha = role === 'civilian' ? 0.55 : 0.85
		const strokeW   = role === 'target'   ? 4    : 2.5
		const rimColor  = role === 'target'   ? 0xffdd44
		                : role === 'civilian' ? 0xaaaaaa
		                : 0xffffff
		const innerCircle = this.scene.add
			.circle(x, y, radius, bodyColor, fillAlpha)
			.setStrokeStyle(strokeW, rimColor, 0.55)
			.setDepth(11)

		// ── Layer 2b: inner highlight arc (top-left sheen) ───────────────────
		const sheen = this.scene.add.graphics().setDepth(12)
		sheen.lineStyle(Math.max(2, radius * 0.22), 0xffffff, 0.18)
		sheen.beginPath()
		sheen.arc(x, y, radius * 0.68, Math.PI * 1.15, Math.PI * 1.72, false)
		sheen.strokePath()

		// ── Layer 3: role badge ──────────────────────────────────────────────
		const badge = this.scene.add.graphics().setDepth(13)
		BadgeDrawer.draw(badge, role, x, y, radius)

		// ── Layer 4: HP ring arc ─────────────────────────────────────────────
		const hpRing = this.scene.add.graphics().setDepth(14)
		this.redrawHPRing(hpRing, x, y, radius, maxHP, maxHP)

		// ── Layer 5: text label ──────────────────────────────────────────────
		const displayLabel = config.labelText ?? ROLE_LABEL[role]
		const labelColor   = role === 'civilian' ? '#bbbbbb'
		                   : role === 'target'   ? '#ffdd44'
		                   : '#ffffff'
		const label = this.scene.add
			.text(x, y - radius - 18, `${displayLabel}  ${maxHP}`, {
				fontSize: '11px',
				fontFamily: 'monospace',
				color: labelColor,
				stroke: '#000000',
				strokeThickness: 3,
			})
			.setOrigin(0.5)
			.setDepth(15)

		// Store sheen in badge slot (we reuse the Graphics field — sheen is static)
		// Actually we need to store sheen separately; add it to badge destroy path.
		// We do this by destroying it via badge — store reference on badge object.
		;(badge as any).__sheen = sheen

		// ── Pulse tween on outer glow ────────────────────────────────────────
		const tween = this.createPulseTween(outerGlow, role)

		this.visuals.set(eid, {
			config,
			outerGlow, innerCircle, badge, hpRing, label, tween,
		})
	}

	/**
	 * Update the HP ring and label for a living entity.
	 * Call this once per frame with the entity's current HP value.
	 */
	update(eid: number, currentHP: number): void {
		const state = this.visuals.get(eid)
		if (!state) return

		const { config, hpRing, label } = state
		const hp = Math.max(0, currentHP)

		this.redrawHPRing(hpRing, config.x, config.y, config.radius, hp, config.maxHP)

		const displayLabel = config.labelText ?? ROLE_LABEL[config.role]
		label.setText(`${displayLabel}  ${hp}`)
	}

	/** Destroy all visual layers for one entity (call on entity death / despawn). */
	destroy(eid: number): void {
		const state = this.visuals.get(eid)
		if (!state) return

		state.tween?.stop()
		state.outerGlow.destroy()
		state.innerCircle.destroy()
		;((state.badge as any).__sheen as Phaser.GameObjects.Graphics | undefined)?.destroy()
		state.badge.destroy()
		state.hpRing.destroy()
		state.label.destroy()

		this.visuals.delete(eid)
	}

	/** Destroy all managed visuals — call from scene shutdown / restart. */
	destroyAll(): void {
		for (const eid of [...this.visuals.keys()]) this.destroy(eid)
	}

	// ── Private helpers ────────────────────────────────────────────────────────

	private redrawHPRing(
		g: Phaser.GameObjects.Graphics,
		x: number, y: number, radius: number,
		currentHP: number, maxHP: number,
	): void {
		g.clear()
		const pct   = maxHP > 0 ? Math.max(0, Math.min(1, currentHP / maxHP)) : 0
		const ringR = radius + HP_RING_GAP

		// Background ring (always full, dark)
		g.lineStyle(HP_RING_WIDTH, 0x222222, 0.55)
		g.beginPath()
		g.arc(x, y, ringR, 0, Math.PI * 2)
		g.strokePath()

		if (pct <= 0) return

		// Coloured HP arc — starts at the top (−π/2), sweeps clockwise
		g.lineStyle(HP_RING_WIDTH, hpColor(pct), 0.92)
		g.beginPath()
		g.arc(x, y, ringR, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false)
		g.strokePath()
	}

	private createPulseTween(
		target: Phaser.GameObjects.Arc,
		role: EntityRole,
	): Phaser.Tweens.Tween {
		const cfg = PULSE_CFG[role]
		return this.scene.tweens.add({
			targets:  target,
			scaleX:   cfg.scale,
			scaleY:   cfg.scale,
			alpha:    cfg.alpha,
			duration: cfg.duration,
			yoyo:     true,
			repeat:   -1,
			ease:     'Sine.easeInOut',
		})
	}
}
