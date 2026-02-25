import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 24 — 「分级打击」
//
// 教学目标：forEach 专家 — lambda 内部使用 if 分支
//   forEach(enemies,
//     eid → if hp(eid) > 50
//           then damageEntity(state, eid, 200)
//           else damageEntity(state, eid, 50))
//
// 场景：4 精英（红，HP=80）+ 4 小兵（灰，HP=20）+ 3 平民（白，HP=5）
// 机制：平民与小兵相邻；对小兵用 200+ 伤害 → 触发溅射 → 伤及平民
//       对精英用 50 伤害 → 无法消灭（HP 80 > 50）
// ─────────────────────────────────────────────────────────────

export const Level24Meta: LevelMeta = {
	key: 'Level24',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-tiered', description: 'Eliminate ALL enemies — use if to choose damage per target', type: 'defeat' }],
	hints: [
		'Elites (red, 80 HP) need ≥ 100 damage. Weak (grey, 20 HP) need ≤ 50.',
		'Overkilling a weak enemy (dealing > 50 to it) triggers a splash that hurts civilians!',
		'Use an if node inside your lambda: if hp(eid) > 50 then 200 else 50',
		'std::cmp::gt(a, b) returns true when a > b.',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',     type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			{ id: 'f-gae',  type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-fe',   type: 'dynamicFunction', position: { x:  300, y: 200 }, data: { functionName: 'list::forEach',      displayName: 'forEach',       namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',    type: 'output',          position: { x:  900, y: 200 }, data: { label: 'Output' } },
			// Lambda
			{ id: 'lam',    type: 'lambdaDef',       position: { x:   60, y: 430 }, data: { functionName: 'tiered', params: ['eid'] } },
			{ id: 'f-hp',   type: 'dynamicFunction', position: { x:  200, y: 530 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-gt',   type: 'dynamicFunction', position: { x:  380, y: 530 }, data: { functionName: 'std::cmp::gt', displayName: '> gt', namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-50', type: 'literal',         position: { x:  200, y: 630 }, data: { value: 50 } },
			{ id: 'f-if',   type: 'if',              position: { x:  550, y: 480 }, data: {} },
			{ id: 'f-dmg-h',type: 'dynamicFunction', position: { x:  380, y: 390 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity(200)', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-200',type: 'literal',         position: { x:  200, y: 390 }, data: { value: 200 } },
			{ id: 'f-dmg-l',type: 'dynamicFunction', position: { x:  380, y: 640 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity(50)', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-50b',type: 'literal',         position: { x:  200, y: 720 }, data: { value: 50 } },
			{ id: 'f-out',  type: 'functionOut',     position: { x:  760, y: 480 }, data: { lambdaId: 'lam' } },
		],
		edges: [
			{ id: 'e1',  source: 'si',      target: 'f-gae',  targetHandle: 'arg0' },
			{ id: 'e2',  source: 'f-gae',   target: 'f-fe',   targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-out',   sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e4',  source: 'f-fe',    target: 'out',    targetHandle: 'value' },
			// Lambda body
			{ id: 'e5',  source: 'si',      target: 'f-hp',   targetHandle: 'arg0' },
			{ id: 'e6',  source: 'lam',     sourceHandle: 'param0', target: 'f-hp',   targetHandle: 'arg1' },
			{ id: 'e7',  source: 'f-hp',    target: 'f-gt',   targetHandle: 'arg0' },
			{ id: 'e8',  source: 'lit-50',  target: 'f-gt',   targetHandle: 'arg1' },
			{ id: 'e9',  source: 'f-gt',    target: 'f-if',   targetHandle: 'condition' },
			// high-damage branch
			{ id: 'e10', source: 'si',      target: 'f-dmg-h',targetHandle: 'arg0' },
			{ id: 'e11', source: 'lam',     sourceHandle: 'param0', target: 'f-dmg-h', targetHandle: 'arg1' },
			{ id: 'e12', source: 'lit-200', target: 'f-dmg-h',targetHandle: 'arg2' },
			{ id: 'e13', source: 'f-dmg-h', target: 'f-if',   targetHandle: 'then' },
			// low-damage branch
			{ id: 'e14', source: 'si',      target: 'f-dmg-l',targetHandle: 'arg0' },
			{ id: 'e15', source: 'lam',     sourceHandle: 'param0', target: 'f-dmg-l', targetHandle: 'arg1' },
			{ id: 'e16', source: 'lit-50b', target: 'f-dmg-l',targetHandle: 'arg2' },
			{ id: 'e17', source: 'f-dmg-l', target: 'f-if',   targetHandle: 'else' },
			{ id: 'e18', source: 'f-if',    target: 'f-out',  targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level24Meta)

type EnemyRole = 'elite' | 'weak' | 'civilian'

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	role: EnemyRole
	penaltyFired: boolean
	spawnX: number
	spawnY: number
}

export class Level24 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private civilians: TrackedEnemy[] = []
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() { super({ key: 'Level24' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.civilians = []
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit')

		this.showInstruction(
			'【Tiered Strike — forEach Expert】\n\n' +
			'Elites (RED, 80 HP): need 200 damage — deal 50 and they survive!\n' +
			'Weak (GREY, 20 HP): need 50 damage — deal 200 and they EXPLODE!\n\n' +
			'Civilians (WHITE) stand next to weak enemies.\n' +
			'Overkilling a weak enemy splashes the civilian — 3 penalties = failure.\n\n' +
			'Use if inside your forEach lambda:\n' +
			'  if hp(eid) > 50 → 200 damage\n' +
			'  else            → 50 damage\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Tiered Strike', [
			'Eliminate ALL 8 enemies (4 elite + 4 weak)',
			'Overkill splash hurts civilians — 3 = failure',
			'Penalties: 0 / 3',
		])

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Elites (red, 80 HP) — spaced far from civilians
		const elitePositions = [{ x: 160, y: 160 }, { x: 800, y: 160 }, { x: 160, y: 480 }, { x: 800, y: 480 }]
		for (const pos of elitePositions) {
			this.spawnUnit(pos.x, pos.y, 0xff3333, 'ELITE', 80, 'elite')
		}

		// Weak enemies (grey, 20 HP) — each paired with a civilian at close offset
		const weakAndCivPairs = [
			{ wx: 380, wy: 180, cx: 320, cy: 180 },
			{ wx: 580, wy: 180, cx: 640, cy: 180 },
			{ wx: 340, wy: 460, cx: 280, cy: 460 },
			{ wx: 620, wy: 460, cx: 680, cy: 460 },
		]
		for (const pair of weakAndCivPairs) {
			this.spawnUnit(pair.wx, pair.wy, 0x888888, 'WEAK', 20, 'weak')
			this.spawnUnit(pair.cx, pair.cy, 0xdddddd, 'CIV', 5, 'civilian')
		}

		// Register civilians for damage-event hook
		const civilianEids = new Set(this.civilians.map(c => c.eid))
		this.world.resources.levelData!['civilianEids'] = civilianEids

		// onDamage hook: if a weak enemy takes > 60 damage, splash nearest civilian
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			const ent = this.enemies.find(e => e.eid === eid && e.role === 'weak')
			if (ent && amount > 60) {
				// Find nearest alive civilian within 100px
				const entBody = this.world.resources.bodies.get(eid)
				if (!entBody) return
				const near = this.civilians.find(civ => {
					if (!this.world.resources.bodies.has(civ.eid)) return false
					const civBody = this.world.resources.bodies.get(civ.eid)!
					const dx = civBody.x - entBody.x
					const dy = civBody.y - entBody.y
					return Math.sqrt(dx * dx + dy * dy) < 100
				})
				if (near && !near.penaltyFired) {
					near.penaltyFired = true
					this.events.emit('civilian-hit', near.eid)
				}
			}
		}

		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const civ = this.civilians.find(c => c.eid === eid)
				if (civ) civ.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 80, 0)
			this.setTaskInfo('Tiered Strike', [
				'Eliminate ALL 8 enemies (4 elite + 4 weak)',
				'Overkill splash hurts civilians — 3 = failure',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) {
				this.onMissionFail()
			}
		})
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update HP labels
		for (const ent of [...this.enemies, ...this.civilians]) {
			if (this.world.resources.bodies.has(ent.eid) && ent.label.active) {
				const roleName = ent.role === 'elite' ? 'ELITE' : ent.role === 'weak' ? 'WEAK' : 'CIV'
				ent.label.setText(`${roleName}(${Math.max(0, Health.current[ent.eid])})`)
			}
		}

		// Clean up dead civilians
		this.civilians = this.civilians.filter(civ => {
			if (!this.world.resources.bodies.has(civ.eid)) {
				if (!civ.penaltyFired) {
					civ.penaltyFired = true
					this.events.emit('civilian-hit', civ.eid)
				}
				civ.marker.destroy()
				civ.label.destroy()
				return false
			}
			return true
		})

		// Win: all enemies (elites + weak) dead
		const combatants = this.enemies.filter(e => e.role !== 'civilian')
		if (combatants.length > 0 && combatants.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnUnit(x: number, y: number, color: number, labelText: string, hp: number, role: EnemyRole): TrackedEnemy {
		const size = role === 'elite' ? 30 : role === 'weak' ? 24 : 18
		const marker = this.add.circle(x, y, size, color, role === 'civilian' ? 0.5 : 0.75).setStrokeStyle(role === 'elite' ? 4 : 2, color)
		const label = this.add.text(x, y - size - 12, `${labelText}(${hp})`, {
			fontSize: '11px', color: role === 'civilian' ? '#aaaaaa' : '#ffffff', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `unit24-${role}-${x}`, color, size * 2, size * 2, x, y, role === 'civilian' ? 2 : 5)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEnemy = { eid, body, marker, label, role, penaltyFired: false, spawnX: x, spawnY: y }
		if (role === 'civilian') {
			this.civilians.push(tracked)
		} else {
			this.enemies.push(tracked)
		}
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('clear-tiered')
		this.showInstruction(
			'Tiered Strike — cleared!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n\n` +
			'if inside forEach — mastered!\n' +
			'The if node lets one lambda handle heterogeneous targets.'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilian casualties.\n\n' +
			'Reduce damage for weak enemies: use if hp > 50 then 200 else 50.\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
