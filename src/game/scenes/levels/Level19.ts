import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 19 — 「只打那个红色的」
//
// 教学目标：
//   getAllEnemies  →  filter(eid → health(eid) > threshold)
//                →  head  →  damageEntity
//
// 场景：5 个平民（白色，10 HP）+ 1 个 Boss 史莱姆（红色，80 HP）
// 规则：每击中平民 +1 惩罚；3 次惩罚 → 任务失败并重置
// ─────────────────────────────────────────────────────────────

export const Level19Meta: LevelMeta = {
	key: 'Level19',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [
		{
			id: 'kill-boss',
			description: 'Eliminate the Target (red): filter by HP, then attack with damageEntity',
			type: 'defeat',
		},
	],
	hints: [
		'getAllEnemies returns ALL entities — civilians included.',
		'Use filter with a lambda: eid → getEntityHealth(state, eid) > 30',
		'Then head to pick the first match, then damageEntity(state, eid, 100)',
	],
	// Complete solution spell:
	//   getAllEnemies → filter(isTarget) → head → damageEntity(state, _, 100)
	//   isTarget = lambda(eid) { getEntityHealth(state, eid) > 30 }
	maxSpellCasts: 3,
	initialSpellWorkflow: {
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
			{ id: 'e12', source: 'lit-30',   target: 'f-gt', targetHandle: 'arg1' },
			{ id: 'e13', source: 'f-gt',     target: 'f-out', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level19Meta)

// ─── Entity tracking ──────────────────────────────────────────
interface TrackedEntity {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	isCivilian: boolean
	penaltyFired: boolean  // tracks whether civilian-hit was already counted (avoids double-count after marker.destroy)
}

export class Level19 extends BaseScene {
	private entities: TrackedEntity[] = []
	private bossEid: number = -1
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() {
		super({ key: 'Level19' })
	}

	protected onLevelCreate(): void {
		// ── Reset all state for clean restart (scene.restart reuses the instance) ──
		this.entities = []
		this.bossEid = -1
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit') // prevent listener accumulation

		this.showInstruction(
			'【The Sniper — Part 1】\n\n' +
			'A Target (RED) is hiding among Civilians (WHITE).\n' +
			'Use filter to isolate the target by HP, then attack it.\n\n' +
			'• Press SPACE to cast your spell\n' +
			'• Hitting a civilian = 1 penalty  (3 = mission failure)\n' +
			'• Open editor with TAB to build your filter lambda'
		)

		this.setTaskInfo(
			'Sniper Mission',
			['Eliminate the Target (red circle)', 'Do NOT hit civilians (white circles)', 'Penalties: 0 / 3']
		)

		// Lock player in place — this is a pure spell-casting puzzle
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			playerBody.setPosition(480, 320)
		}

		// Spawn civilians (white, 10 HP) — random scatter
		const civilianPositions = [
			{ x: 160, y: 200 }, { x: 320, y: 160 }, { x: 720, y: 160 },
			{ x: 800, y: 360 }, { x: 480, y: 490 },
		]
		for (const pos of civilianPositions) {
			this.spawnUnit(pos.x, pos.y, 0xdddddd, 'CIVILIAN', 10, true)
		}

		// Spawn Boss (red, 80 HP) — slightly offset from center
		const bossPos = { x: 480, y: 160 }
		const boss = this.spawnUnit(bossPos.x, bossPos.y, 0xff3333, 'TARGET', 80, false)
		this.bossEid = boss.eid

		// Register civilian eids in levelData so damageEntity can fire penalty events
		const civilianEids = new Set(this.entities.filter(e => e.isCivilian).map(e => e.eid))
		this.world.resources.levelData!['civilianEids'] = civilianEids
		this.world.resources.levelData!['scene'] = this

		// Listen for civilian-hit events fired from damageEntity (via levelData hook)
		// eid is passed so we can mark the entity as penalized → prevents fallback double-count
		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.entities.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 80, 0)
			this.setTaskInfo(
				'Sniper Mission',
				[
					'Eliminate the Target (red circle)',
					'Do NOT hit civilians (white circles)',
					`Penalties: ${this.penaltyCount} / 3`,
				]
			)
			if (this.penaltyCount >= 3) {
				this.onMissionFail()
			} else {
				this.showInstruction(`FRIENDLY FIRE! ${this.penaltyCount}/3 — Fix your filter!`)
			}
		})

		// SPACE to cast bound spell
		this.input.keyboard?.on('keydown-SPACE', () => {
			if (!this.levelFailed && !this.levelWon) {
				// The event system handles bound spells; emit a tick so any onKeyPressed binding fires
				// Player binds their spell to SPACE in the editor
			}
		})
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player
		const playerEid = this.world.resources.playerEid
		const pb = this.world.resources.bodies.get(playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Detect civilian deaths (body removed by deathSystem)
		// Use entity-level penaltyFired flag (NOT Phaser DataManager) to avoid
		// double-counting: after marker.destroy() the DataManager is recreated each
		// frame, making getData() return undefined repeatedly and firing extra penalties.
		this.entities = this.entities.filter(ent => {
			if (ent.isCivilian && !this.world.resources.bodies.has(ent.eid)) {
				if (!ent.penaltyFired) {
					ent.penaltyFired = true
					this.events.emit('civilian-hit', ent.eid)
				}
				ent.marker.destroy()
				ent.label.destroy()
				return false  // remove dead civilian from list
			}
			return true
		})

		// Win condition: boss despawned (killed by damageEntity + deathSystem)
		if (!this.world.resources.bodies.has(this.bossEid)) {
			this.onMissionSuccess()
		}
	}

	// ── Helpers ──────────────────────────────────────────────────

	private spawnUnit(
		x: number, y: number,
		color: number, labelText: string,
		hp: number, isCivilian: boolean
	): TrackedEntity {
		const size = isCivilian ? 28 : 36

		const marker = this.add
			.circle(x, y, size, color, isCivilian ? 0.55 : 0.75)
			.setStrokeStyle(isCivilian ? 2 : 4, color)

		const label = this.add
			.text(x, y - size - 14, labelText, {
				fontSize: isCivilian ? '12px' : '14px',
				color: isCivilian ? '#cccccc' : '#ff6666',
				stroke: '#000000',
				strokeThickness: 3,
			})
			.setOrigin(0.5)

		const body = createRectBody(this, `unit-${labelText}-${x}`, color, size * 2, size * 2, x, y, isCivilian ? 2 : 5)
		body.setImmovable(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = hp
		Health.current[eid] = hp

		const tracked: TrackedEntity = { eid, body, marker, label, isCivilian, penaltyFired: false }
		this.entities.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('kill-boss')
		this.showInstruction(
			'Target eliminated!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n` +
			'filter → head → damageEntity — mastered!'
		)
		// Navigation is handled by the Victory UI (Next Level / Replay / Menu buttons)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilian casualties.\n\n' +
			'Check your filter condition: it must exclude HP ≤ 10.\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
