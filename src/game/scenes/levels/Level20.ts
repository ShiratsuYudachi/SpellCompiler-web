import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import { EntityVisualManager } from '../../EntityVisual'
import type { EntityRole } from '../../EntityVisual'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 20 — "Precision Guidance"
//
// Teaching goal:
//   getAllEnemies → filter( and(gt(hp, 25), lt(hp, 60)) )
//                → head → damageEntity
//
// New concept: logic::and combines two conditions to narrow the filter
//
// Setup (HP designed so a single threshold cannot isolate the target):
//   4 civilians (white, 10 HP) — do not hit
//   3 weak (gray, 18 HP) — can miss-hit, no score
//   3 heavy (purple, 75 HP) — can miss-hit, no score
//   1 target (orange, 40 HP) — must kill
//
// Only and(gt(hp,25), lt(hp,60)) isolates the 40 HP target
// ─────────────────────────────────────────────────────────────

const _answer: { nodes: any[]; edges: any[] } = {
		nodes: [
			// ── Main chain ──────────────────────────────────────────
			{
				id: 'si',
				type: 'spellInput',
				position: { x: -200, y: 200 },
				data: { label: 'Game State', params: ['state'] },
			},
			{
				id: 'f-gae',
				type: 'dynamicFunction',
				position: { x: 60, y: 200 },
				data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] },
			},
			{
				id: 'f-filter',
				type: 'dynamicFunction',
				position: { x: 280, y: 200 },
				data: { functionName: 'list::filter', displayName: 'filter', namespace: 'list', params: ['l', 'pred'] },
			},
			{
				id: 'f-head',
				type: 'dynamicFunction',
				position: { x: 500, y: 130 },
				data: { functionName: 'list::head', displayName: 'head', namespace: 'list', params: ['l'] },
			},
			{
				id: 'f-dmg',
				type: 'dynamicFunction',
				position: { x: 680, y: 200 },
				data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] },
			},
			{ id: 'lit-100', type: 'literal', position: { x: 500, y: 300 }, data: { value: 100 } },
			{ id: 'out', type: 'output', position: { x: 900, y: 200 }, data: { label: 'Output' } },

			// ── Lambda: isMedium(eid) → and(hp>25, hp<60) ──────────
			{
				id: 'lam',
				type: 'lambdaDef',
				position: { x: 60, y: 440 },
				data: { functionName: 'isMedium', params: ['eid'] },
			},
			{
				id: 'f-out',
				type: 'functionOut',
				position: { x: 680, y: 510 },
				data: { lambdaId: 'lam' },
			},
			// Shared health query (two outgoing edges → f-gt and f-lt)
			{
				id: 'f-health',
				type: 'dynamicFunction',
				position: { x: 200, y: 510 },
				data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] },
			},
			{
				id: 'f-gt',
				type: 'dynamicFunction',
				position: { x: 390, y: 450 },
				data: { functionName: 'std::cmp::gt', displayName: '> gt', namespace: 'std::cmp', params: ['a', 'b'] },
			},
			{ id: 'lit-25', type: 'literal', position: { x: 200, y: 440 }, data: { value: 25 } },
			{
				id: 'f-lt',
				type: 'dynamicFunction',
				position: { x: 390, y: 570 },
				data: { functionName: 'std::cmp::lt', displayName: '< lt', namespace: 'std::cmp', params: ['a', 'b'] },
			},
			{ id: 'lit-60', type: 'literal', position: { x: 200, y: 590 }, data: { value: 60 } },
			{
				id: 'f-and',
				type: 'dynamicFunction',
				position: { x: 550, y: 510 },
				data: { functionName: 'std::logic::and', displayName: 'and', namespace: 'std::logic', params: ['a', 'b'] },
			},
		],
		edges: [
			// Main chain
			{ id: 'e1', source: 'si',      target: 'f-gae',    targetHandle: 'arg0' },
			{ id: 'e2', source: 'f-gae',   target: 'f-filter', targetHandle: 'arg0' },
			{ id: 'e3', source: 'f-out',   sourceHandle: 'function', target: 'f-filter', targetHandle: 'arg1' },
			{ id: 'e4', source: 'f-filter',target: 'f-head',   targetHandle: 'arg0' },
			{ id: 'e5', source: 'si',      target: 'f-dmg',    targetHandle: 'arg0' },
			{ id: 'e6', source: 'f-head',  target: 'f-dmg',    targetHandle: 'arg1' },
			{ id: 'e7', source: 'lit-100', target: 'f-dmg',    targetHandle: 'arg2' },
			{ id: 'e8', source: 'f-dmg',   target: 'out',      targetHandle: 'value' },
			// Lambda body
			{ id: 'e9',  source: 'si',  target: 'f-health', targetHandle: 'arg0' },
			{ id: 'e10', source: 'lam', sourceHandle: 'param0', target: 'f-health', targetHandle: 'arg1' },
			{ id: 'e11', source: 'f-health', target: 'f-gt', targetHandle: 'arg0' },
			{ id: 'e12', source: 'lit-25',   target: 'f-gt', targetHandle: 'arg1' },
			{ id: 'e13', source: 'f-health', target: 'f-lt', targetHandle: 'arg0' },
			{ id: 'e14', source: 'lit-60',   target: 'f-lt', targetHandle: 'arg1' },
			{ id: 'e15', source: 'f-gt',  target: 'f-and', targetHandle: 'arg0' },
			{ id: 'e16', source: 'f-lt',  target: 'f-and', targetHandle: 'arg1' },
			{ id: 'e17', source: 'f-and', target: 'f-out', targetHandle: 'value' },
		],
	};

export const Level20Meta: LevelMeta = {
	key: 'Level20',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [
		{
			id: 'kill-target',
			description: 'Eliminate the orange Target only — use a double-condition filter (AND)',
			type: 'defeat',
		},
	],
	hints: [
		'A single threshold cannot isolate the orange target (40 HP).',
		'Hint: civilians are 10 HP, weak enemies 18 HP, guards 75 HP, target 40 HP.',
		'You need: filter(eid → and(gt(health, 25), lt(health, 60)))',
		'logic::and takes two booleans and returns true only if BOTH are true.',
	],
	maxSpellCasts: 3,
	initialSpellWorkflow: _answer,
	answerSpellWorkflow: _answer,
}

levelRegistry.register(Level20Meta)

// ── Entity tracking ───────────────────────────────────────────────────────────

interface TrackedEntity {
	eid: number
	body: Phaser.Physics.Arcade.Image
	role: 'civilian' | 'weak' | 'guard' | 'target'
	penaltyFired: boolean
}

// ── Scene ─────────────────────────────────────────────────────────────────────

export class Level20 extends BaseScene {
	private entities: TrackedEntity[] = []
	private targetEid: number = -1
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	/** Visual layer manager — owns all Phaser display objects for entities. */
	private visuals!: EntityVisualManager

	constructor() {
		super({ key: 'Level20' })
	}

	protected onLevelCreate(): void {
		// ── Reset state ──────────────────────────────────────────────────────
		this.entities     = []
		this.targetEid    = -1
		this.penaltyCount = 0
		this.levelFailed  = false
		this.levelWon     = false
		this.events.removeAllListeners('civilian-hit')

		// Destroy previous visual manager if this is a restart
		if (this.visuals) this.visuals.destroyAll()
		this.visuals = new EntityVisualManager(this)

		// ── Instructions ─────────────────────────────────────────────────────
		this.showInstruction(
			'【The Sniper — Part 2: Double Filter】\n\n' +
			'The orange Target (40 HP) hides among:\n' +
			'  • White civilians (10 HP) — DO NOT TOUCH\n' +
			'  • Grey weak enemies (18 HP) — not your goal\n' +
			'  • Purple heavy guards (75 HP) — not your goal\n\n' +
			'One threshold is NOT enough. Combine two conditions with and().\n' +
			'Press SPACE to cast your spell.'
		)

		this.setTaskInfo('Precision Strike', [
			'Kill the Orange Target (40 HP)',
			'Civilians protected — 3 hits = failure',
			`Penalties: 0 / 3`,
		])

		// Lock player at centre
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// ── Spawn civilians (white, 10 HP) ───────────────────────────────────
		const civilianPositions = [
			{ x: 160, y: 200 }, { x: 800, y: 200 },
			{ x: 160, y: 450 }, { x: 800, y: 450 },
		]
		for (const pos of civilianPositions) {
			this.spawnUnit(pos.x, pos.y, 0xdddddd, 10, 'civilian')
		}

		// ── Spawn weak enemies (grey, 18 HP) ─────────────────────────────────
		const weakPositions = [
			{ x: 280, y: 180 }, { x: 480, y: 160 }, { x: 680, y: 180 },
		]
		for (const pos of weakPositions) {
			this.spawnUnit(pos.x, pos.y, 0x888888, 18, 'weak')
		}

		// ── Spawn heavy guards (purple, 75 HP) ───────────────────────────────
		const guardPositions = [
			{ x: 240, y: 450 }, { x: 480, y: 480 }, { x: 720, y: 450 },
		]
		for (const pos of guardPositions) {
			this.spawnUnit(pos.x, pos.y, 0x9900cc, 75, 'guard')
		}

		// ── Spawn the target (orange, 40 HP) ─────────────────────────────────
		const target = this.spawnUnit(480, 290, 0xff8800, 40, 'target')
		this.targetEid = target.eid

		// ── Register civilian EIDs for damage-event hook ──────────────────────
		const civilianEids = new Set(this.entities.filter(e => e.role === 'civilian').map(e => e.eid))
		this.world.resources.levelData!['civilianEids'] = civilianEids

		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.entities.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 80, 0)
			this.setTaskInfo('Precision Strike', [
				'Kill the Orange Target (40 HP)',
				'Civilians protected — 3 hits = failure',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) {
				this.onMissionFail()
			} else {
				this.showInstruction(`FRIENDLY FIRE! ${this.penaltyCount}/3 — Refine your filter!`)
			}
		})
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// ── Per-entity update / death detection ──────────────────────────────
		const dead: TrackedEntity[] = []

		for (const ent of this.entities) {
			if (this.world.resources.bodies.has(ent.eid)) {
				// Alive — refresh HP ring and label
				this.visuals.update(ent.eid, Health.current[ent.eid])
			} else {
				// Dead — fire civilian penalty if applicable
				if (ent.role === 'civilian' && !ent.penaltyFired) {
					ent.penaltyFired = true
					this.events.emit('civilian-hit', ent.eid)
				}
				dead.push(ent)
			}
		}

		// Remove dead entities from tracking and destroy their visuals
		for (const ent of dead) {
			this.visuals.destroy(ent.eid)
			this.entities.splice(this.entities.indexOf(ent), 1)
		}

		// ── Win condition ─────────────────────────────────────────────────────
		if (this.targetEid !== -1 && !this.world.resources.bodies.has(this.targetEid)) {
			this.onMissionSuccess()
		}
	}

	// ── Spawn helper ──────────────────────────────────────────────────────────

	private spawnUnit(
		x: number, y: number,
		color: number, hp: number,
		role: TrackedEntity['role'],
	): TrackedEntity {
		const radius = role === 'target' ? 34 : role === 'guard' ? 30 : 24

		// Physics body
		const body = createRectBody(
			this, `unit-${role}-${x}`, color,
			radius * 2, radius * 2, x, y,
			role === 'civilian' ? 2 : 5
		)
		body.setImmovable(true)
		body.setAlpha(0)          // physics hitbox stays, square texture hidden

		// ECS entity
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid]     = hp
		Health.current[eid] = hp

		// Visuals (all layers handed to EntityVisualManager)
		this.visuals.register(eid, {
			role:      role as EntityRole,
			x, y,
			radius,
			bodyColor: color,
			maxHP:     hp,
		})

		const tracked: TrackedEntity = { eid, body, role, penaltyFired: false }
		this.entities.push(tracked)
		return tracked
	}

	// ── Win / Fail handlers ───────────────────────────────────────────────────

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('kill-target')
		this.showInstruction(
			'Target eliminated!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n` +
			'and(gt(hp, 25), lt(hp, 60)) — double filter mastered!'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilian casualties.\n\n' +
			'Your filter must exclude HP ≤ 10.\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
