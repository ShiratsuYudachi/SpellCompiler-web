import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 23 — 「精准剂量」
//
// 教学目标：forEach 进阶 — lambda 内部二次查询同一 eid
//   forEach(enemies, eid → damageEntity(state, eid, getEntityHealth(state, eid)))
//
// 场景：5 个 HP 不同的敌人（随机洗牌）
// 约束：总伤害不能超过总 HP 的 120%（否则 overkill 警告）
// 关键洞察：eid 既是目标，也是 getEntityHealth 的参数
// ─────────────────────────────────────────────────────────────

export const Level23Meta: LevelMeta = {
	key: 'Level23',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-precise', description: 'Eliminate all enemies — deal damage equal to each one\'s HP', type: 'defeat' }],
	hints: [
		'getEntityHealth(state, eid) returns the current HP of an entity.',
		'Inside a lambda, you already have eid — use it to query HP!',
		'forEach(enemies, eid → damageEntity(state, eid, getEntityHealth(state, eid)))',
		'Overkill (total damage > 120% of total HP) = mission failure.',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',      type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			{ id: 'f-gae',   type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-fe',    type: 'dynamicFunction', position: { x:  300, y: 200 }, data: { functionName: 'list::forEach',      displayName: 'forEach',       namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',     type: 'output',          position: { x:  560, y: 200 }, data: { label: 'Output' } },
			// Lambda
			{ id: 'lam',     type: 'lambdaDef',       position: { x:   60, y: 430 }, data: { functionName: 'precise', params: ['eid'] } },
			{ id: 'f-hp',    type: 'dynamicFunction', position: { x:  220, y: 520 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-dmg',   type: 'dynamicFunction', position: { x:  420, y: 430 }, data: { functionName: 'game::damageEntity',   displayName: 'damageEntity',   namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'f-out',   type: 'functionOut',     position: { x:  660, y: 430 }, data: { lambdaId: 'lam' } },
		],
		edges: [
			{ id: 'e1', source: 'si',    target: 'f-gae', targetHandle: 'arg0' },
			{ id: 'e2', source: 'f-gae', target: 'f-fe',  targetHandle: 'arg0' },
			{ id: 'e3', source: 'f-out', sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e4', source: 'f-fe',  target: 'out',   targetHandle: 'value' },
			// Lambda body
			{ id: 'e5', source: 'si',   target: 'f-hp',  targetHandle: 'arg0' },
			{ id: 'e6', source: 'lam',  sourceHandle: 'param0', target: 'f-hp',  targetHandle: 'arg1' },
			{ id: 'e7', source: 'si',   target: 'f-dmg', targetHandle: 'arg0' },
			{ id: 'e8', source: 'lam',  sourceHandle: 'param0', target: 'f-dmg', targetHandle: 'arg1' },
			{ id: 'e9', source: 'f-hp', target: 'f-dmg', targetHandle: 'arg2' },
			{ id: 'e10',source: 'f-dmg',target: 'f-out', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level23Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	initialHP: number
}

export class Level23 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private totalHPRequired: number = 0
	private totalDamageDealt: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() { super({ key: 'Level23' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.totalHPRequired = 0
		this.totalDamageDealt = 0
		this.levelFailed = false
		this.levelWon = false

		this.showInstruction(
			'【Precise Dosage — forEach Advanced】\n\n' +
			'Five enemies, each with a DIFFERENT HP value.\n\n' +
			'Challenge: total damage dealt must not exceed 120% of total HP.\n' +
			'A fixed damageEntity(eid, 999) will trigger overkill!\n\n' +
			'Key insight: inside the lambda you already have eid.\n' +
			'Use it AGAIN with getEntityHealth(state, eid) to get the exact HP.\n\n' +
			'forEach(enemies,\n  eid → damageEntity(state, eid, getEntityHealth(state, eid)))\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Precise Dosage', [
			'Eliminate all 5 enemies',
			'Overkill limit: total damage ≤ 120% of total HP',
			'Use getEntityHealth inside the lambda',
		])

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		const hpValues = this.shuffleArray([20, 35, 55, 70, 90])
		const positions = [
			{ x: 180, y: 180 }, { x: 480, y: 140 }, { x: 780, y: 180 },
			{ x: 260, y: 460 }, { x: 700, y: 460 },
		]

		for (let i = 0; i < positions.length; i++) {
			const ent = this.spawnEnemy(positions[i].x, positions[i].y, hpValues[i])
			this.totalHPRequired += hpValues[i]
		}

		// Register onDamage hook to track total damage dealt
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			const ent = this.enemies.find(e => e.eid === eid)
			if (ent) {
				const actualDamage = Math.min(amount, Health.current[eid] + amount) // cap at remaining HP
				this.totalDamageDealt += actualDamage
			}
		}
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update HP labels
		for (const ent of this.enemies) {
			if (this.world.resources.bodies.has(ent.eid) && ent.label.active) {
				ent.label.setText(`HP: ${Math.max(0, Health.current[ent.eid])}`)
			}
		}

		// Overkill check
		if (this.totalDamageDealt > this.totalHPRequired * 1.2 && this.totalDamageDealt > 0) {
			this.onMissionFail('Overkill! Total damage too high.')
			return
		}

		// Win: all enemies dead
		if (this.enemies.length > 0 && this.enemies.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, hp: number): TrackedEnemy {
		const size = 26
		const color = 0xff6600
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(3, color)
		const label = this.add.text(x, y - size - 12, `HP: ${hp}`, {
			fontSize: '13px', color: '#ffcc00', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `enemy23-${x}-${y}`, color, size * 2, size * 2, x, y, 5)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEnemy = { eid, body, marker, label, initialHP: hp }
		this.enemies.push(tracked)
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
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('clear-precise')
		this.showInstruction(
			'Precise Dosage — cleared!\n\n' +
			`Total damage: ${Math.round(this.totalDamageDealt)} / ${this.totalHPRequired} required\n\n` +
			'Key insight: eid inside a lambda can be used MULTIPLE TIMES\n' +
			'both as the target AND as the query parameter.'
		)
	}

	private onMissionFail(reason: string): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 80, 0)
		this.showInstruction(
			`MISSION FAILED — ${reason}\n\n` +
			'Replace the fixed damage amount with getEntityHealth(state, eid).\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
