import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 26 — 「反应堆燃料」
//
// 教学目标：map 进阶 — map 提取数据 + fold 聚合 (MapReduce)
//   fuels = filter(enemies, eid → lt(hp(eid), 60))
//   hpList = map(fuels, eid → getEntityHealth(state, eid))
//   total  = fold(hpList, 0, (acc, hp) → add(acc, hp))
//   core   = head(filter(enemies, eid → gte(hp(eid), 60)))
//   damageEntity(state, core, total)
//
// FYP 亮点：filter → map → fold 就是 MapReduce 的完整流程
// ─────────────────────────────────────────────────────────────

export const Level26Meta: LevelMeta = {
	key: 'Level26',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'destroy-core', description: 'Calculate the reactor core HP and deal exactly that much damage', type: 'defeat' }],
	hints: [
		'The reactor core HP (???) equals the SUM of all 4 fuel cell HPs.',
		'Step 1: filter enemies with hp < 60 to get fuel cells.',
		'Step 2: map(fuels, eid → getEntityHealth(state, eid)) converts eids to HP numbers.',
		'Step 3: fold(hpList, 0, (acc, hp) → add(acc, hp)) sums them all.',
		'Step 4: filter to find the core (hp ≥ 60), then head, then damageEntity.',
		'Wrong damage amount (±5 error) = shield deflects — core HP restores!',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',      type: 'spellInput',     position: { x: -200, y: 300 }, data: { label: 'Game State', params: ['state'] } },
			// getAllEnemies (shared source, used twice)
			{ id: 'f-gae1',  type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-gae2',  type: 'dynamicFunction', position: { x:   60, y: 420 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			// filter fuels (hp < 60)
			{ id: 'f-filt1', type: 'dynamicFunction', position: { x:  260, y: 200 }, data: { functionName: 'list::filter', displayName: 'filter(fuels)', namespace: 'list', params: ['l', 'pred'] } },
			{ id: 'lam-f1',  type: 'lambdaDef',       position: { x:   60, y: 600 }, data: { functionName: 'isFuel', params: ['eid'] } },
			{ id: 'f-hp1',   type: 'dynamicFunction', position: { x:  200, y: 660 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-lt',    type: 'dynamicFunction', position: { x:  370, y: 660 }, data: { functionName: 'std::cmp::lt', displayName: '< lt', namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-60a', type: 'literal',         position: { x:  200, y: 750 }, data: { value: 60 } },
			{ id: 'fout-f1', type: 'functionOut',     position: { x:  530, y: 660 }, data: { lambdaId: 'lam-f1' } },
			// map fuels → hp values
			{ id: 'f-map',   type: 'dynamicFunction', position: { x:  460, y: 200 }, data: { functionName: 'list::map', displayName: 'map', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-m',   type: 'lambdaDef',       position: { x:  460, y: 430 }, data: { functionName: 'toHP', params: ['eid'] } },
			{ id: 'f-hp2',   type: 'dynamicFunction', position: { x:  600, y: 490 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'fout-m',  type: 'functionOut',     position: { x:  760, y: 430 }, data: { lambdaId: 'lam-m' } },
			// fold → sum
			{ id: 'f-fold',  type: 'dynamicFunction', position: { x:  660, y: 200 }, data: { functionName: 'list::fold', displayName: 'fold', namespace: 'list', params: ['l', 'init', 'f'] } },
			{ id: 'lit-0',   type: 'literal',         position: { x:  550, y: 300 }, data: { value: 0 } },
			{ id: 'lam-a',   type: 'lambdaDef',       position: { x:  660, y: 380 }, data: { functionName: 'add', params: ['acc', 'hp'] } },
			{ id: 'f-add',   type: 'dynamicFunction', position: { x:  800, y: 440 }, data: { functionName: 'std::math::add', displayName: 'add', namespace: 'std::math', params: ['a', 'b'] } },
			{ id: 'fout-a',  type: 'functionOut',     position: { x:  960, y: 380 }, data: { lambdaId: 'lam-a' } },
			// filter core (hp >= 60)
			{ id: 'f-filt2', type: 'dynamicFunction', position: { x:  260, y: 420 }, data: { functionName: 'list::filter', displayName: 'filter(core)', namespace: 'list', params: ['l', 'pred'] } },
			{ id: 'lam-f2',  type: 'lambdaDef',       position: { x:   60, y: 840 }, data: { functionName: 'isCore', params: ['eid'] } },
			{ id: 'f-hp3',   type: 'dynamicFunction', position: { x:  200, y: 900 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-gte',   type: 'dynamicFunction', position: { x:  370, y: 900 }, data: { functionName: 'std::cmp::gte', displayName: '≥ gte', namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-60b', type: 'literal',         position: { x:  200, y: 990 }, data: { value: 60 } },
			{ id: 'fout-f2', type: 'functionOut',     position: { x:  530, y: 900 }, data: { lambdaId: 'lam-f2' } },
			// head + damageEntity
			{ id: 'f-head',  type: 'dynamicFunction', position: { x:  460, y: 420 }, data: { functionName: 'list::head', displayName: 'head', namespace: 'list', params: ['l'] } },
			{ id: 'f-dmg',   type: 'dynamicFunction', position: { x:  860, y: 300 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'out',     type: 'output',          position: { x: 1060, y: 300 }, data: { label: 'Output' } },
		],
		edges: [
			// getAllEnemies
			{ id: 'e1',  source: 'si',      target: 'f-gae1', targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',      target: 'f-gae2', targetHandle: 'arg0' },
			// filter fuels
			{ id: 'e3',  source: 'f-gae1',  target: 'f-filt1',targetHandle: 'arg0' },
			{ id: 'e4',  source: 'fout-f1', sourceHandle: 'function', target: 'f-filt1', targetHandle: 'arg1' },
			// filter fuels lambda body
			{ id: 'e5',  source: 'si',      target: 'f-hp1',  targetHandle: 'arg0' },
			{ id: 'e6',  source: 'lam-f1',  sourceHandle: 'param0', target: 'f-hp1', targetHandle: 'arg1' },
			{ id: 'e7',  source: 'f-hp1',   target: 'f-lt',   targetHandle: 'arg0' },
			{ id: 'e8',  source: 'lit-60a', target: 'f-lt',   targetHandle: 'arg1' },
			{ id: 'e9',  source: 'f-lt',    target: 'fout-f1',targetHandle: 'value' },
			// map fuels → hp
			{ id: 'e10', source: 'f-filt1', target: 'f-map',  targetHandle: 'arg0' },
			{ id: 'e11', source: 'fout-m',  sourceHandle: 'function', target: 'f-map', targetHandle: 'arg1' },
			// map lambda body
			{ id: 'e12', source: 'si',      target: 'f-hp2',  targetHandle: 'arg0' },
			{ id: 'e13', source: 'lam-m',   sourceHandle: 'param0', target: 'f-hp2', targetHandle: 'arg1' },
			{ id: 'e14', source: 'f-hp2',   target: 'fout-m', targetHandle: 'value' },
			// fold
			{ id: 'e15', source: 'f-map',   target: 'f-fold', targetHandle: 'arg0' },
			{ id: 'e16', source: 'lit-0',   target: 'f-fold', targetHandle: 'arg1' },
			{ id: 'e17', source: 'fout-a',  sourceHandle: 'function', target: 'f-fold', targetHandle: 'arg2' },
			// fold lambda body
			{ id: 'e18', source: 'lam-a',   sourceHandle: 'param0', target: 'f-add', targetHandle: 'arg0' },
			{ id: 'e19', source: 'lam-a',   sourceHandle: 'param1', target: 'f-add', targetHandle: 'arg1' },
			{ id: 'e20', source: 'f-add',   target: 'fout-a', targetHandle: 'value' },
			// filter core
			{ id: 'e21', source: 'f-gae2',  target: 'f-filt2',targetHandle: 'arg0' },
			{ id: 'e22', source: 'fout-f2', sourceHandle: 'function', target: 'f-filt2', targetHandle: 'arg1' },
			// filter core lambda body
			{ id: 'e23', source: 'si',      target: 'f-hp3',  targetHandle: 'arg0' },
			{ id: 'e24', source: 'lam-f2',  sourceHandle: 'param0', target: 'f-hp3', targetHandle: 'arg1' },
			{ id: 'e25', source: 'f-hp3',   target: 'f-gte',  targetHandle: 'arg0' },
			{ id: 'e26', source: 'lit-60b', target: 'f-gte',  targetHandle: 'arg1' },
			{ id: 'e27', source: 'f-gte',   target: 'fout-f2',targetHandle: 'value' },
			// head + damageEntity
			{ id: 'e28', source: 'f-filt2', target: 'f-head', targetHandle: 'arg0' },
			{ id: 'e29', source: 'si',      target: 'f-dmg',  targetHandle: 'arg0' },
			{ id: 'e30', source: 'f-head',  target: 'f-dmg',  targetHandle: 'arg1' },
			{ id: 'e31', source: 'f-fold',  target: 'f-dmg',  targetHandle: 'arg2' },
			{ id: 'e32', source: 'f-dmg',   target: 'out',    targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level26Meta)

interface TrackedEntity {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc | Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	role: 'fuel' | 'core'
	initialHP: number
}

export class Level26 extends BaseScene {
	private entities: TrackedEntity[] = []
	private coreEid: number = -1
	private requiredDamage: number = 0
	private levelWon: boolean = false

	constructor() { super({ key: 'Level26' }) }

	protected onLevelCreate(): void {
		this.entities = []
		this.coreEid = -1
		this.requiredDamage = 0
		this.levelWon = false

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Fuel cells: random HP drawn from a large pool so the sum varies each run.
		// Using a fixed set like [15,25,35,45] would make the sum always 120 —
		// a player could hardcode damageEntity(core,120) and skip the fold entirely.
		// Pool: multiples of 3 in [12,48], guaranteed individual < 60 and min-sum ≥ 60.
		const pool = [12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45, 48]
		const fuelHPs = this.shuffleArray(pool).slice(0, 4)
		const fuelPositions = [{ x: 180, y: 180 }, { x: 780, y: 180 }, { x: 180, y: 460 }, { x: 780, y: 460 }]
		let totalFuelHP = 0
		for (let i = 0; i < 4; i++) {
			this.spawnFuel(fuelPositions[i].x, fuelPositions[i].y, fuelHPs[i])
			totalFuelHP += fuelHPs[i]
		}
		this.requiredDamage = totalFuelHP

		// Reactor core: HP = sum of fuels, displayed as "???"
		const core = this.spawnCore(480, 320, totalFuelHP)
		this.coreEid = core.eid

		// Core is immune to fireball damage — can only die from exact damageEntity call
		this.world.resources.levelData!['fireballImmuneEids'] = new Set([this.coreEid])

		// Register onDamage hook: invalid damage on core → restore HP
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			if (eid !== this.coreEid) return
			const diff = Math.abs(amount - this.requiredDamage)
			if (diff > 5) {
				// Shield deflects: restore HP
				Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + amount)
				const scene = this.world.resources.scene as Phaser.Scene
				this.showInstruction(
					`Shield deflected! (damage=${amount}, required=${this.requiredDamage})\n\n` +
					'Calculate the exact sum of fuel cell HPs first.\n' +
					'filter → map → fold → damageEntity'
				)
				scene.cameras.main.shake(200, 0.015)
			}
		}

		this.showInstruction(
			'【Reactor Fuel — map Advanced】\n\n' +
			'The reactor core (BLACK) is shielded.\n' +
			'Only EXACT damage equal to the sum of all 4 fuel cell HPs can break it.\n\n' +
			'Step 1: filter enemies with hp < 60  → fuel cells\n' +
			'Step 2: map(fuels, eid → hp(eid))     → list of HP values\n' +
			'Step 3: fold(hpList, 0, add)          → total HP\n' +
			'Step 4: find core, damageEntity(core, total)\n\n' +
			'This is MapReduce — a fundamental pattern in computing!\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Reactor Fuel', [
			'Find total fuel energy (map + fold)',
			'Destroy the reactor core with exact damage',
			'Wrong amount = shield deflects',
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update fuel HP labels (core stays "???")
		for (const ent of this.entities) {
			if (ent.role === 'fuel' && this.world.resources.bodies.has(ent.eid) && ent.label.active) {
				ent.label.setText(`FUEL HP:${Math.max(0, Health.current[ent.eid])}`)
			}
		}

		if (this.coreEid > -1 && !this.world.resources.bodies.has(this.coreEid)) {
			this.onMissionSuccess()
		}
	}

	private spawnFuel(x: number, y: number, hp: number): TrackedEntity {
		const size = 24
		const color = 0x3399ff
		const marker = this.add.circle(x, y, size, color, 0.7).setStrokeStyle(2, color)
		const label = this.add.text(x, y - size - 12, `FUEL HP:${hp}`, {
			fontSize: '11px', color: '#88ccff', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `fuel26-${x}`, color, size * 2, size * 2, x, y, 3)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEntity = { eid, body, marker, label, role: 'fuel', initialHP: hp }
		this.entities.push(tracked)
		return tracked
	}

	private spawnCore(x: number, y: number, hp: number): TrackedEntity {
		const size = 36
		const color = 0x222222
		const marker = this.add.circle(x, y, size, color, 0.9).setStrokeStyle(4, 0xffffff)
		const label = this.add.text(x, y - size - 14, 'CORE HP:???', {
			fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 4,
		}).setOrigin(0.5)
		// Pulsing animation
		this.tweens.add({ targets: marker, scaleX: 1.1, scaleY: 1.1, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
		const body = createRectBody(this, 'core26', color, size * 2, size * 2, x, y, 8)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEntity = { eid, body, marker, label, role: 'core', initialHP: hp }
		this.entities.push(tracked)
		return tracked
	}

	private shuffleArray(arr: number[]): number[] {
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
		this.cameras.main.flash(500, 0, 200, 255)
		this.completeObjectiveById('destroy-core')
		this.showInstruction(
			'Reactor Core destroyed!\n\n' +
			`Required damage: ${this.requiredDamage}\n\n` +
			'filter → map → fold — MapReduce mastered!\n\n' +
			'This pattern scales to any data processing problem:\n' +
			'  filter (select) → map (transform) → fold (aggregate)'
		)
	}
}
