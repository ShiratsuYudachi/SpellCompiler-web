import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 30 — 「复合清场」（组合关卡 I）
//
// 教学目标：综合运用 forEach + spawnFireball（无脚手架）
//   场景：4 个盾卫（HP=10，红，上半区）+ 4 个无人机（HP=10，灰，下半区）
//
//   盾卫受 onDamage 保护：直接 damageEntity 会被反弹（HP 恢复）
//     → 必须用 spawnFireball（方向型攻击）才能击破
//   无人机：同样用 spawnFireball（fireball 不触发 onDamage，直接扣血）
//
//   Solution:
//     playerPos = getEntityPosition(state, getPlayer(state))
//     forEach(getAllEnemies(state), eid →
//       spawnFireball(state, playerPos,
//         normalize(subtract(getEntityPosition(state, eid), playerPos)))
//     )
//
// 模板已提供完整施法流程；直接按 SPACE 施法即可通关。
// ─────────────────────────────────────────────────────────────

export const Level30Meta: LevelMeta = {
	key: 'Level30',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-all', description: 'Eliminate all 8 enemies using spawnFireball', type: 'defeat' }],
	hints: [
		'RED elites (HP=10, TOP): damageEntity is BLOCKED by their shield!',
		'Use spawnFireball(state, position, direction) to bypass the shield.',
		'Compute direction: normalize(subtract(getEntityPosition(state, eid), playerPos))',
		'GREY drones (HP=10, BOTTOM): fireballs work on them too — same approach.',
		'Use forEach on getAllEnemies → spawnFireball toward each enemy.',
	],
	// Template: forEach all enemies → spawnFireball toward each.
	// Fireballs deal 10 dmg and bypass the elite shield (only damageEntity is blocked).
	// Both elites (HP=10) and drones (HP=10) die in one fireball hit. One cast clears all.
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',     type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			// Player position
			{ id: 'f-gp',  type: 'dynamicFunction', position: { x:   60, y:  60 }, data: { functionName: 'game::getPlayer',        displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',  type: 'dynamicFunction', position: { x:  260, y:  60 }, data: { functionName: 'game::getEntityPosition', displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			// getAllEnemies → forEach → out
			{ id: 'f-gae', type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-fe',  type: 'dynamicFunction', position: { x:  300, y: 200 }, data: { functionName: 'list::forEach', displayName: 'forEach', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',   type: 'output',           position: { x:  540, y: 200 }, data: { label: 'Output' } },
			// Lambda: hit(eid) — spawnFireball toward enemy
			{ id: 'lam',   type: 'lambdaDef',        position: { x:   60, y: 420 }, data: { functionName: 'hit', params: ['eid'] } },
			// Enemy position → direction vector
			{ id: 'f-ep',  type: 'dynamicFunction', position: { x:  200, y: 500 }, data: { functionName: 'game::getEntityPosition', displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-sub', type: 'dynamicFunction', position: { x:  400, y: 500 }, data: { functionName: 'vec::subtract',  displayName: 'subtract', namespace: 'vec', params: ['a', 'b'] } },
			{ id: 'f-norm',type: 'dynamicFunction', position: { x:  600, y: 500 }, data: { functionName: 'vec::normalize', displayName: 'normalize', namespace: 'vec', params: ['v'] } },
			// spawnFireball: state, player position, normalized direction
			{ id: 'f-sfb', type: 'dynamicFunction', position: { x:  640, y: 580 }, data: { functionName: 'game::spawnFireball', displayName: 'spawnFireball', namespace: 'game', params: ['state', 'position', 'direction'] } },
			{ id: 'fout',  type: 'functionOut',      position: { x:  880, y: 420 }, data: { lambdaId: 'lam' } },
		],
		edges: [
			// Player position
			{ id: 'e1',  source: 'si',     target: 'f-gp',  targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',     target: 'f-pp',  targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-gp',  target: 'f-pp',  targetHandle: 'arg1' },
			// getAllEnemies → forEach → out
			{ id: 'e4',  source: 'si',     target: 'f-gae', targetHandle: 'arg0' },
			{ id: 'e5',  source: 'f-gae', target: 'f-fe',  targetHandle: 'arg0' },
			{ id: 'e6',  source: 'fout',  sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e7',  source: 'f-fe',  target: 'out',   targetHandle: 'value' },
			// Lambda body — enemy position → direction
			{ id: 'e8',  source: 'si',    target: 'f-ep',  targetHandle: 'arg0' },
			{ id: 'e9',  source: 'lam',   sourceHandle: 'param0', target: 'f-ep', targetHandle: 'arg1' },
			{ id: 'e10', source: 'f-ep',  target: 'f-sub', targetHandle: 'arg0' },
			{ id: 'e11', source: 'f-pp',  target: 'f-sub', targetHandle: 'arg1' },
			{ id: 'e12', source: 'f-sub', target: 'f-norm',targetHandle: 'arg0' },
			// spawnFireball: state directly, player position, normalized direction
			{ id: 'e13', source: 'si',    target: 'f-sfb', targetHandle: 'arg0' },
			{ id: 'e14', source: 'f-pp',  target: 'f-sfb', targetHandle: 'arg1' },
			{ id: 'e15', source: 'f-norm',target: 'f-sfb', targetHandle: 'arg2' },
			{ id: 'e16', source: 'f-sfb', target: 'fout',  targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level30Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	role: 'elite' | 'drone'
}

export class Level30 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private shieldedEids: Set<number> = new Set()
	private levelWon: boolean = false
	private levelFailed: boolean = false

	constructor() { super({ key: 'Level30' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.shieldedEids = new Set()
		this.levelWon = false
		this.levelFailed = false

		// 4 red elites (HP=10) in top half — shielded, need fireballs
		const elitePositions = [
			{ x: 160, y: 140 }, { x: 360, y: 130 },
			{ x: 580, y: 140 }, { x: 780, y: 130 },
		]
		for (const pos of elitePositions) {
			this.spawnElite(pos.x, pos.y)
		}

		// 4 grey drones (HP=10) in bottom half — also killed by fireballs
		const dronePositions = [
			{ x: 200, y: 460 }, { x: 400, y: 470 },
			{ x: 600, y: 460 }, { x: 800, y: 470 },
		]
		for (const pos of dronePositions) {
			this.spawnDrone(pos.x, pos.y)
		}

		// All enemies can be hit by fireballs.
		// Elites have a SHIELD (onDamage hook) that blocks damageEntity — only fireballs work on them.
		// Drones have no shield — both damageEntity and fireballs work.

		// onDamage hook: shield elites from direct damageEntity
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			if (!this.shieldedEids.has(eid)) return
			// Restore HP — shield deflects the hit
			const newHp = Math.min(Health.current[eid] + amount, Health.max[eid])
			Health.current[eid] = newHp
			// Visual feedback
			const ent = this.enemies.find(e => e.eid === eid)
			if (ent) {
				this.cameras.main.shake(80, 0.006)
				this.cameras.main.flash(60, 255, 100, 0)
				// Brief shield flash on the marker
				const origColor = 0xff4444
				ent.marker.setFillStyle(0xffffff, 1)
				this.time.delayedCall(120, () => {
					if (ent.marker.active) ent.marker.setFillStyle(origColor, 0.75)
				})
				this.setTaskInfo('Combined Assault', [
					'RED elites: use spawnFireball (shield blocks damageEntity)',
					'GREY drones: fireballs work too!',
					'⚠ Shield deflected — use fireballs for red enemies!',
				])
			}
		}

		// Visual zone divider
		this.add.rectangle(480, 320, 960, 2, 0xffffff, 0.15)
		this.add.text(480, 68, '— TOP ZONE: ELITES (shield) —', {
			fontSize: '13px', color: '#ff8888', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		this.add.text(480, 570, '— BOTTOM ZONE: DRONES —', {
			fontSize: '13px', color: '#aaaaaa', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)

		this.showInstruction(
			'【Combined Assault — Synthesis I】\n\n' +
			'RED elites (HP=10, TOP): Their SHIELD blocks damageEntity!\n' +
			'  → Must use spawnFireball(state, position, direction) to bypass.\n' +
			'  Direction = normalize(subtract(enemyPos, playerPos))\n\n' +
			'GREY drones (HP=10, BOTTOM): Fireballs also work on them!\n\n' +
			'Use forEach + spawnFireball for ALL enemies:\n' +
			'  getAllEnemies → forEach → spawnFireball toward each\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Combined Assault', [
			'RED elites: use spawnFireball (shield blocks damageEntity)',
			'GREY drones: fireballs work too!',
			`Remaining: ${this.enemies.length} / 8`,
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelWon || this.levelFailed) return

		// Clean up dead enemies
		this.enemies = this.enemies.filter(ent => {
			if (!this.world.resources.bodies.has(ent.eid)) {
				ent.marker.destroy()
				ent.label.destroy()
				this.shieldedEids.delete(ent.eid)
				return false
			}
			return true
		})

		// Update task info
		const alive = this.enemies.length
		if (alive > 0) {
			const elites = this.enemies.filter(e => e.role === 'elite').length
			const drones = this.enemies.filter(e => e.role === 'drone').length
			this.setTaskInfo('Combined Assault', [
				`Elites remaining: ${elites} / 4`,
				`Drones remaining: ${drones} / 4`,
			])
		}

		// Win condition: all dead
		if (this.enemies.length === 0) {
			this.onMissionSuccess()
		}
	}

	private spawnElite(x: number, y: number): TrackedEnemy {
		const size = 24
		const hp = 10
		const color = 0xff4444
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(4, 0xffaa00)
		const label = this.add.text(x, y - size - 12, 'ELITE', {
			fontSize: '11px', color: '#ffaa44', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		// Shield icon
		this.add.text(x, y, '🛡', { fontSize: '14px' }).setOrigin(0.5)

		const body = createRectBody(this, `elite30-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp

		this.shieldedEids.add(eid)
		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'elite' }
		this.enemies.push(tracked)
		return tracked
	}

	private spawnDrone(x: number, y: number): TrackedEnemy {
		const size = 16
		const hp = 10
		const color = 0x888888
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(2, color)
		const label = this.add.text(x, y - size - 10, 'DRONE', {
			fontSize: '10px', color: '#cccccc', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)

		const body = createRectBody(this, `drone30-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp

		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'drone' }
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(500, 0, 255, 100)
		this.completeObjectiveById('clear-all')
		this.showInstruction(
			'All enemies eliminated!\n\n' +
			'SYNTHESIS COMPLETE:\n' +
			'  ✓ forEach — iterated over all enemies\n' +
			'  ✓ getEntityPosition — located each enemy\n' +
			'  ✓ normalize + subtract — computed attack directions\n' +
			'  ✓ spawnFireball — bypassed elite shield, killed all targets\n\n' +
			'One more challenge awaits — the final trial!'
		)
	}
}
