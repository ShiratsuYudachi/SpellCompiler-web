import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 21 — 「最大威胁」
//
// 教学目标：用 fold 求 argmax（HP 最大的实体）
//
//   fold(
//     getAllEnemies(state),
//     -1,                                       ← 哨兵初值
//     (best, eid) →
//       if getEntityHealth(state,eid) > getEntityHealth(state,best)
//       then eid
//       else best
//   )  →  damageEntity(state, result, 200)
//
// 为什么 filter 不够用？
//   每次载入关卡，5 个敌人的 HP 都会重新随机洗牌。
//   玩家无法用固定阈值找到"最高血量"的那个——必须用 fold。
//
// 场景：
//   5 个敌人（随机 HP，范围 20-115，其中最高 HP 那个是目标）
//   4 个平民（白，10 HP，严禁击中）
//   关卡仅在 HP 最高的敌人死亡时胜利
// ─────────────────────────────────────────────────────────────

export const Level21Meta: LevelMeta = {
	key: 'Level21',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [
		{
			id: 'kill-strongest',
			description: 'Destroy the entity with the HIGHEST HP — use fold to find the maximum',
			type: 'defeat',
		},
	],
	hints: [
		'Enemy HP values are randomized every attempt — no fixed threshold works.',
		'Use fold(list, -1, (best,eid) → if hp(eid)>hp(best) then eid else best)',
		'getEntityHealth(state, -1) returns -1, so the first real enemy always wins.',
		'After fold you have the eid of the strongest enemy — pass it to damageEntity.',
	],
	// Complete solution spell:
	//   fold(getAllEnemies(state), -1, findMax)  →  damageEntity(state, result, 200)
	//   findMax = lambda(best, eid) { if hp(eid) > hp(best) then eid else best }
	initialSpellWorkflow: {
		nodes: [
			// ── Main chain ──────────────────────────────────────────
			{
				id: 'si',
				type: 'spellInput',
				position: { x: -180, y: 220 },
				data: { label: 'Game State', params: ['state'] },
			},
			{
				id: 'f-gae',
				type: 'dynamicFunction',
				position: { x: 60, y: 220 },
				data: {
					functionName: 'game::getAllEnemies',
					displayName: 'getAllEnemies',
					namespace: 'game',
					params: ['state'],
				},
			},
			{
				id: 'f-fold',
				type: 'dynamicFunction',
				position: { x: 320, y: 200 },
				data: {
					functionName: 'list::fold',
					displayName: 'fold',
					namespace: 'list',
					params: ['l', 'init', 'f'],
				},
			},
			{ id: 'lit-neg1', type: 'literal', position: { x: 100, y: 380 }, data: { value: -1 } },
			{
				id: 'f-dmg',
				type: 'dynamicFunction',
				position: { x: 600, y: 200 },
				data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] },
			},
			{ id: 'lit-200', type: 'literal', position: { x: 420, y: 380 }, data: { value: 200 } },
			{ id: 'out', type: 'output', position: { x: 860, y: 220 }, data: { label: 'Output' } },

			// ── Lambda: findMax(best, eid) → if hp(eid)>hp(best) then eid else best ──
			{
				id: 'lam',
				type: 'lambdaDef',
				position: { x: 60, y: 500 },
				data: { functionName: 'findMax', params: ['best', 'eid'] },
			},
			{
				id: 'f-out',
				type: 'functionOut',
				position: { x: 760, y: 600 },
				data: { lambdaId: 'lam' },
			},
			// getEntityHealth for the current eid candidate
			{
				id: 'f-health-eid',
				type: 'dynamicFunction',
				position: { x: 240, y: 480 },
				data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] },
			},
			// getEntityHealth for the current best accumulator
			{
				id: 'f-health-best',
				type: 'dynamicFunction',
				position: { x: 240, y: 630 },
				data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] },
			},
			{
				id: 'f-gt',
				type: 'dynamicFunction',
				position: { x: 450, y: 550 },
				data: { functionName: 'std::cmp::gt', displayName: '> gt', namespace: 'std::cmp', params: ['a', 'b'] },
			},
			{
				id: 'f-if',
				type: 'if',
				position: { x: 610, y: 570 },
				data: {},
			},
		],
		edges: [
			// Main chain
			{ id: 'e1', source: 'si',       target: 'f-gae',  targetHandle: 'arg0' },
			{ id: 'e2', source: 'f-gae',    target: 'f-fold', targetHandle: 'arg0' },
			{ id: 'e3', source: 'lit-neg1', target: 'f-fold', targetHandle: 'arg1' },
			{ id: 'e4', source: 'f-out',    sourceHandle: 'function', target: 'f-fold', targetHandle: 'arg2' },
			{ id: 'e5', source: 'si',       target: 'f-dmg',  targetHandle: 'arg0' },
			{ id: 'e6', source: 'f-fold',   target: 'f-dmg',  targetHandle: 'arg1' },
			{ id: 'e7', source: 'lit-200',  target: 'f-dmg',  targetHandle: 'arg2' },
			{ id: 'e8', source: 'f-dmg',    target: 'out',    targetHandle: 'value' },
			// Lambda body
			{ id: 'e9',  source: 'si',           target: 'f-health-eid',  targetHandle: 'arg0' },
			{ id: 'e10', source: 'lam',          sourceHandle: 'param1',  target: 'f-health-eid',  targetHandle: 'arg1' },
			{ id: 'e11', source: 'si',           target: 'f-health-best', targetHandle: 'arg0' },
			{ id: 'e12', source: 'lam',          sourceHandle: 'param0',  target: 'f-health-best', targetHandle: 'arg1' },
			{ id: 'e13', source: 'f-health-eid', target: 'f-gt', targetHandle: 'arg0' },
			{ id: 'e14', source: 'f-health-best',target: 'f-gt', targetHandle: 'arg1' },
			{ id: 'e15', source: 'f-gt',         target: 'f-if', targetHandle: 'condition' },
			{ id: 'e16', source: 'lam',          sourceHandle: 'param1', target: 'f-if', targetHandle: 'then' },
			{ id: 'e17', source: 'lam',          sourceHandle: 'param0', target: 'f-if', targetHandle: 'else' },
			{ id: 'e18', source: 'f-if',         target: 'f-out', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level21Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	hpLabel: Phaser.GameObjects.Text
	hp: number
	isCivilian: boolean
}

export class Level21 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private supremeEid: number = -1   // entity with max HP — the win target
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() {
		super({ key: 'Level21' })
	}

	protected onLevelCreate(): void {
		// ── Reset all state for clean restart (scene.restart reuses the instance) ──
		this.enemies = []
		this.supremeEid = -1
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit') // prevent listener accumulation

		this.showInstruction(
			'【The Sniper — Part 3: Maximum Threat】\n\n' +
			'Enemy HP values are RANDOMIZED — a fixed filter will not work.\n' +
			'You must find the entity with the HIGHEST HP using fold.\n\n' +
			'fold(list, -1, (best, eid) →\n' +
			'  if hp(eid) > hp(best) then eid else best)\n\n' +
			'• Civilians (white, 10 HP) — DO NOT HIT  (3 hits = failure)\n' +
			'• Enemies (colored) — HP shown on screen\n' +
			'• Only killing the STRONGEST enemy completes the mission.\n\n' +
			'Press SPACE to cast your spell.'
		)

		this.setTaskInfo('Maximum Threat', [
			'Destroy the enemy with the HIGHEST HP',
			'Use fold to find the maximum',
			'Civilians protected — 3 hits = failure',
		])

		// Lock player
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Randomize 5 enemy HP values — ensure one is clearly dominant
		const enemyHPs = this.shuffleHPs([115, 80, 55, 35, 20])

		const enemyPositions = [
			{ x: 200, y: 200 },
			{ x: 480, y: 160 },
			{ x: 760, y: 200 },
			{ x: 280, y: 450 },
			{ x: 680, y: 450 },
		]

		// Color palette for enemies (excluding white/grey reserved for civilians)
		const enemyColors = [0xff3333, 0xff8800, 0xffcc00, 0x33cc33, 0x3399ff]

		let maxHP = -1
		for (let i = 0; i < enemyPositions.length; i++) {
			const pos = enemyPositions[i]
			const hp = enemyHPs[i]
			const color = enemyColors[i]
			const ent = this.spawnEnemy(pos.x, pos.y, color, hp)
			this.enemies.push(ent)
			if (hp > maxHP) {
				maxHP = hp
				this.supremeEid = ent.eid
			}
		}

		// Mark the supreme threat visually (pulsing ring)
		// — deliberately subtle so player still uses fold, not sight-reading
		const supreme = this.enemies.find(e => e.eid === this.supremeEid)!
		this.tweens.add({
			targets: supreme.marker,
			scaleX: 1.2,
			scaleY: 1.2,
			duration: 600,
			yoyo: true,
			repeat: -1,
			ease: 'Sine.easeInOut',
		})

		// Spawn civilians (white, 10 HP)
		const civilianPositions = [
			{ x: 160, y: 320 }, { x: 800, y: 320 },
			{ x: 480, y: 320 }, { x: 340, y: 280 },
		]
		for (const pos of civilianPositions) {
			const ent = this.spawnCivilian(pos.x, pos.y)
			this.enemies.push(ent)
		}

		// Register civilians for damage-event hook
		const civilianEids = new Set(this.enemies.filter(e => e.isCivilian).map(e => e.eid))
		this.world.resources.levelData!['civilianEids'] = civilianEids

		this.events.on('civilian-hit', () => {
			if (this.levelFailed || this.levelWon) return
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 80, 0)
			this.setTaskInfo('Maximum Threat', [
				'Destroy the enemy with the HIGHEST HP',
				'Use fold to find the maximum',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) {
				this.onMissionFail()
			} else {
				this.showInstruction(`FRIENDLY FIRE! ${this.penaltyCount}/3\nRefine your fold — civilians are eid < threshold…`)
			}
		})
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Fallback civilian penalty
		for (const ent of this.enemies) {
			if (ent.isCivilian && !this.world.resources.bodies.has(ent.eid)) {
				if (!ent.marker.getData('penaltyFired')) {
					ent.marker.setData('penaltyFired', true)
					this.events.emit('civilian-hit')
				}
				ent.marker.destroy()
				ent.hpLabel.destroy()
			}
		}

		// Win: supreme threat despawned
		if (!this.world.resources.bodies.has(this.supremeEid)) {
			this.onMissionSuccess()
		}
	}

	// ── Helpers ──────────────────────────────────────────────────

	private spawnEnemy(x: number, y: number, color: number, hp: number): TrackedEnemy {
		const size = 28

		const marker = this.add
			.circle(x, y, size, color, 0.7)
			.setStrokeStyle(3, color)

		const hpLabel = this.add
			.text(x, y - size - 14, `HP: ${hp}`, {
				fontSize: '13px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 3,
			})
			.setOrigin(0.5)

		const body = createRectBody(this, `enemy-${x}-${y}`, color, size * 2, size * 2, x, y, 5)
		body.setImmovable(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = hp
		Health.current[eid] = hp

		return { eid, body, marker, hpLabel, hp, isCivilian: false }
	}

	private spawnCivilian(x: number, y: number): TrackedEnemy {
		const hp = 10
		const size = 22

		const marker = this.add
			.circle(x, y, size, 0xdddddd, 0.5)
			.setStrokeStyle(2, 0xdddddd)

		const hpLabel = this.add
			.text(x, y - size - 12, 'CIVILIAN', {
				fontSize: '11px',
				color: '#aaaaaa',
				stroke: '#000000',
				strokeThickness: 2,
			})
			.setOrigin(0.5)

		const body = createRectBody(this, `civilian-${x}-${y}`, 0xdddddd, size * 2, size * 2, x, y, 2)
		body.setImmovable(true)

		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)

		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)

		Health.max[eid] = hp
		Health.current[eid] = hp

		return { eid, body, marker, hpLabel, hp, isCivilian: true }
	}

	/** Fisher-Yates shuffle */
	private shuffleHPs(arr: number[]): number[] {
		const a = [...arr]
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]]
		}
		return a
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(500, 0, 255, 100)
		this.completeObjectiveById('kill-strongest')
		this.showInstruction(
			'Supreme Threat eliminated!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n\n` +
			'fold as argmax — mastered!\n' +
			'The trilogy is complete.'
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
			'Your fold must not return civilian eids.\n' +
			'Remember: getEntityHealth(state, eid) > getEntityHealth(state, best)\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
