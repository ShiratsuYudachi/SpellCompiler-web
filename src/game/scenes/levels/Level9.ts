import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import { EntityVisualManager } from '../../EntityVisual'
import type { EntityRole } from '../../EntityVisual'
import { flowToIR } from '../../../editor/utils/flowToIR'
import { updateSpellInCache } from '../../systems/eventProcessSystem'
import { eventQueue } from '../../events/EventQueue'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 9 — "Only Red" (Sniper Mission)
//
// Teaching goal:
//   getAllEnemies → filter(eid → getEntityHealth(state, eid) > 30)
//                → head → damageEntity(state, eid, 100)
//
// Setup: 5 civilians (white, 10 HP) + 1 Target (red, 80 HP)
// Rule: Hitting a civilian = +1 penalty; 3 penalties → mission fail
// ─────────────────────────────────────────────────────────────

const LEVEL9_SPELL_ID = '__level9_auto_spell'

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

		// ── Lambda: isTarget(eid) → health(eid) > 30 ───────────
		{
			id: 'lam',
			type: 'lambdaDef',
			position: { x: 60, y: 420 },
			data: { functionName: 'isTarget', params: ['eid'] },
		},
		{
			id: 'f-out',
			type: 'functionOut',
			position: { x: 500, y: 490 },
			data: { lambdaId: 'lam' },
		},
		{
			id: 'f-health',
			type: 'dynamicFunction',
			position: { x: 200, y: 490 },
			data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] },
		},
		{
			id: 'f-gt',
			type: 'dynamicFunction',
			position: { x: 370, y: 490 },
			data: { functionName: 'std::cmp::gt', displayName: '> gt', namespace: 'std::cmp', params: ['a', 'b'] },
		},
		{ id: 'lit-30', type: 'literal', position: { x: 200, y: 580 }, data: { value: 30 } },
	],
	edges: [
		// Main chain
		{ id: 'e1', source: 'si',       target: 'f-gae',    targetHandle: 'arg0' },
		{ id: 'e2', source: 'f-gae',    target: 'f-filter', targetHandle: 'arg0' },
		{ id: 'e3', source: 'f-out',    sourceHandle: 'function', target: 'f-filter', targetHandle: 'arg1' },
		{ id: 'e4', source: 'f-filter', target: 'f-head',   targetHandle: 'arg0' },
		{ id: 'e5', source: 'si',       target: 'f-dmg',    targetHandle: 'arg0' },
		{ id: 'e6', source: 'f-head',   target: 'f-dmg',    targetHandle: 'arg1' },
		{ id: 'e7', source: 'lit-100',  target: 'f-dmg',    targetHandle: 'arg2' },
		{ id: 'e8', source: 'f-dmg',    target: 'out',      targetHandle: 'value' },
		// Lambda body
		{ id: 'e9',  source: 'si',       target: 'f-health', targetHandle: 'arg0' },
		{ id: 'e10', source: 'lam',      sourceHandle: 'param0', target: 'f-health', targetHandle: 'arg1' },
		{ id: 'e11', source: 'f-health', target: 'f-gt',    targetHandle: 'arg0' },
		{ id: 'e12', source: 'lit-30',   target: 'f-gt',    targetHandle: 'arg1' },
		{ id: 'e13', source: 'f-gt',     target: 'f-out',   targetHandle: 'value' },
	],
}

export const Level9Meta: LevelMeta = {
	key: 'Level9',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [
		{
			id: 'kill-target',
			description: 'Eliminate the red Target — filter enemies by HP > 30, then damageEntity',
			type: 'defeat',
		},
	],
	hints: [
		'getAllEnemies returns ALL entities — civilians included.',
		'Use filter with a lambda: eid → getEntityHealth(state, eid) > 30',
		'Then head to pick the first match, then damageEntity(state, eid, 100)',
		'Civilians have 10 HP, the red Target has 80 HP.',
	],
	maxSpellCasts: 5,
	initialSpellWorkflow: _answer,
	answerSpellWorkflow: _answer,
}

levelRegistry.register(Level9Meta)

// ─── Entity tracking ──────────────────────────────────────────

interface TrackedEntity {
	eid: number
	body: Phaser.Physics.Arcade.Image
	role: 'civilian' | 'target'
	penaltyFired: boolean
}

// ─── Scene ────────────────────────────────────────────────────

export class Level9 extends BaseScene {
	private entities: TrackedEntity[] = []
	private targetEid: number = -1
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	/** Visual layer manager — owns all Phaser display objects for entities. */
	private visuals!: EntityVisualManager

	constructor() {
		super({ key: 'Level9' })
	}

	protected onLevelCreate(): void {
		// ── Reset state ──────────────────────────────────────────
		this.entities     = []
		this.targetEid    = -1
		this.penaltyCount = 0
		this.levelFailed  = false
		this.levelWon     = false
		this.events.removeAllListeners('civilian-hit')

		// Destroy previous visual manager if this is a restart
		if (this.visuals) this.visuals.destroyAll()
		this.visuals = new EntityVisualManager(this)

		// ── Auto-compile and bind spell to SPACE ─────────────────
		try {
			const spell = flowToIR(_answer.nodes as any, _answer.edges as any)
			updateSpellInCache(LEVEL9_SPELL_ID, spell)
			eventQueue.removeBinding(LEVEL9_SPELL_ID)
			eventQueue.addBinding({
				id: LEVEL9_SPELL_ID,
				eventName: 'onKeyPressed',
				keyOrButton: ' ',
				spellId: LEVEL9_SPELL_ID,
				triggerMode: 'press',
			})
		} catch (e) {
			console.error('[Level9] Failed to pre-compile spell:', e)
		}

		// ── Instructions ─────────────────────────────────────────
		this.showInstruction(
			'【The Sniper — Filter by HP】\n\n' +
			'A red Target (80 HP) hides among white Civilians (10 HP).\n' +
			'Press SPACE to cast a filter spell that attacks only the Target.\n\n' +
			'• The spell uses filter(eid → health > 30) to isolate the Target\n' +
			'• Hitting a civilian = 1 penalty  (3 = mission failure)\n' +
			'• TAB to open the editor and study the filter spell'
		)

		this.setTaskInfo('Sniper Mission', [
			'Eliminate the red Target (80 HP)',
			'Do NOT hit civilians (10 HP)',
			'Penalties: 0 / 3',
		])

		// Lock player at centre — pure spell-casting puzzle
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// ── Spawn civilians (white, 10 HP) ───────────────────────
		const civilianPositions = [
			{ x: 160, y: 200 }, { x: 320, y: 160 },
			{ x: 720, y: 160 }, { x: 800, y: 360 },
			{ x: 480, y: 490 },
		]
		for (const pos of civilianPositions) {
			this.spawnUnit(pos.x, pos.y, 0xdddddd, 10, 'civilian')
		}

		// ── Spawn Target (red, 80 HP) ─────────────────────────────
		const target = this.spawnUnit(480, 220, 0xff3333, 80, 'target')
		this.targetEid = target.eid

		// ── Register civilian EIDs for damage-event hook ──────────
		const civilianEids = new Set(
			this.entities.filter(e => e.role === 'civilian').map(e => e.eid)
		)
		this.world.resources.levelData!['civilianEids'] = civilianEids

		// ── Civilian-hit penalty listener ─────────────────────────
		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.entities.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 80, 0)
			this.setTaskInfo('Sniper Mission', [
				'Eliminate the red Target (80 HP)',
				'Do NOT hit civilians (10 HP)',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) {
				this.onMissionFail()
			} else {
				this.showInstruction(`FRIENDLY FIRE! ${this.penaltyCount}/3 — Your filter hit a civilian!`)
			}
		})
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// ── Per-entity update / death detection ──────────────────
		const dead: TrackedEntity[] = []

		for (const ent of this.entities) {
			if (this.world.resources.bodies.has(ent.eid)) {
				// Alive — refresh HP ring
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

		// Remove dead entities
		for (const ent of dead) {
			this.visuals.destroy(ent.eid)
			this.entities.splice(this.entities.indexOf(ent), 1)
		}

		// ── Win condition ─────────────────────────────────────────
		if (this.targetEid !== -1 && !this.world.resources.bodies.has(this.targetEid)) {
			this.onMissionSuccess()
		}
	}

	// ── Spawn helper ──────────────────────────────────────────────

	private spawnUnit(
		x: number, y: number,
		color: number, hp: number,
		role: TrackedEntity['role'],
	): TrackedEntity {
		const radius = role === 'target' ? 34 : 24

		// Physics body (invisible — visuals handled by EntityVisualManager)
		const body = createRectBody(
			this, `unit-${role}-${x}-${y}`, color,
			radius * 2, radius * 2, x, y,
			role === 'civilian' ? 2 : 5
		)
		body.setImmovable(true)
		body.setAlpha(0)

		// ECS entity
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid]     = hp
		Health.current[eid] = hp

		// Rich visuals (EntityVisualManager handles all layers)
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

	// ── Win / Fail handlers ──────────────────────────────────────

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('kill-target')
		this.showInstruction(
			'Target eliminated!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n` +
			'filter(hp > 30) → head → damageEntity — mastered!'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilian casualties.\n\n' +
			'Your filter must return true only for HP > 30.\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
