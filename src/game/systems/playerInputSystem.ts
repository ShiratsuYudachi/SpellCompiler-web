/**
 * ⚠️ LEGACY SYSTEM - DO NOT USE ⚠️
 * 
 * This file is kept for reference only.
 * Player input is now handled by the Event System.
 * 
 * See: LEGACY_SYSTEMS_MIGRATION_GUIDE.md
 * Migration: All player actions (movement, attacks, spells) are now
 * implemented as spells bound to events via EventBindingPanel.
 * 
 * Date removed: 2026-01-25
 */

import Phaser from 'phaser'
import { query } from 'bitecs'
import { Health, Player, PlayerControl, Sprite, Velocity } from '../components'
import type { GameWorld } from '../gameWorld'
import { areaAttack } from './utils/attack'
import { spawnFireball } from '../prefabs/spawnFireball'
import { castSpell } from '../spells/castSpell'

export function playerInputSystem(world: GameWorld) {
	for (const eid of query(world, [Player, Sprite, Velocity, PlayerControl, Health])) {
		updateMove(world, eid)
		updateMelee(world, eid)
		updateFireball(world, eid)
		updateSpell1(world, eid)
	}
}

export function queueFireball(playerEid: number, x: number, y: number) {
	PlayerControl.fireballQueued[playerEid] = 1
	PlayerControl.fireballTargetX[playerEid] = x
	PlayerControl.fireballTargetY[playerEid] = y
}

function updateMove(world: GameWorld, eid: number) {
	const { cursors, keys } = world.resources.input

	let x = 0
	let y = 0

	if (cursors.left?.isDown || keys.A.isDown) x -= 1
	if (cursors.right?.isDown || keys.D.isDown) x += 1
	if (cursors.up?.isDown || keys.W.isDown) y -= 1
	if (cursors.down?.isDown || keys.S.isDown) y += 1

	if (x !== 0 || y !== 0) {
		const len = Math.sqrt(x * x + y * y)
		x /= len
		y /= len
	}

	const speed = PlayerControl.moveSpeed[eid]
	Velocity.x[eid] = x * speed
	Velocity.y[eid] = y * speed
}

function updateMelee(world: GameWorld, eid: number) {
	const key = world.resources.input.meleeKey
	if (!Phaser.Input.Keyboard.JustDown(key)) {
		return
	}

	const now = Date.now()
	if (now < PlayerControl.nextMeleeAt[eid]) {
		return
	}
	PlayerControl.nextMeleeAt[eid] = now + PlayerControl.meleeCooldownMs[eid]

	const body = world.resources.bodies.get(eid)
	if (!body) {
		return
	}

	world.resources.scene.tweens.add({
		targets: body,
		scaleX: 1.15,
		scaleY: 1.15,
		yoyo: true,
		duration: 80,
		ease: 'Quad.easeOut',
	})

	areaAttack(
		world,
		eid,
		{ x: body.x, y: body.y },
		PlayerControl.meleeRadius[eid],
		PlayerControl.meleeDamage[eid],
	)
}

function updateFireball(world: GameWorld, eid: number) {
	if (!PlayerControl.fireballQueued[eid]) {
		return
	}

	const now = Date.now()
	if (now < PlayerControl.nextFireballAt[eid]) {
		return
	}

	PlayerControl.nextFireballAt[eid] = now + PlayerControl.fireballCooldownMs[eid]
	PlayerControl.fireballQueued[eid] = 0

	const body = world.resources.bodies.get(eid)
	if (!body) {
		return
	}

	const tx = PlayerControl.fireballTargetX[eid]
	const ty = PlayerControl.fireballTargetY[eid]

	const dx = tx - body.x
	const dy = ty - body.y
	const dist = Math.sqrt(dx * dx + dy * dy) || 1

	spawnFireball(
		world,
		world.resources.scene as Phaser.Scene & { physics: Phaser.Physics.Arcade.ArcadePhysics },
		world.resources.bodies,
		eid,
		body.x,
		body.y,
		dx / dist,
		dy / dist,
	)
}

function updateSpell1(world: GameWorld, eid: number) {
	const key = world.resources.input.spellKey1
	if (!Phaser.Input.Keyboard.JustDown(key)) {
		return
	}

	const spell = world.resources.spellByEid.get(eid)
	if (!spell) {
		world.resources.spellMessageByEid.set(eid, 'No spell equipped.')
		return
	}

	try {
		const result = castSpell(world, eid, spell)
		world.resources.spellMessageByEid.set(eid, `Spell result: ${JSON.stringify(result)}`)
	} catch (err) {
		world.resources.spellMessageByEid.set(
			eid,
			`Spell error: ${err instanceof Error ? err.message : String(err)}`,
		)
	}
}


