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
// 教学目标：综合运用 forEach + map + filter（无脚手架）
//   场景：4 个盾卫（HP=80，红，上半区）+ 4 个零件（HP=30，灰，下半区）
//
//   盾卫受 onDamage 保护：直接 damageEntity 会被反弹（HP 恢复）
//     → 必须用 spawnFireball（方向型攻击）才能击破
//   零件：正常 damageEntity 有效
//
//   Solution:
//     // 消灭盾卫：计算方向 → 发射火球
//     elites = filter(getAllEnemies(state), eid → gt(hp(eid), 60))
//     dirs = map(elites, eid → normalize(subtract(getEntityPosition(state,eid), playerPos)))
//     forEach(dirs, dir → spawnFireball(state, dir))
//
//     // 消灭零件：直接伤害
//     drones = filter(getAllEnemies(state), eid → lte(hp(eid), 60))
//     forEach(drones, eid → damageEntity(state, eid, 100))
//
// 编辑器为空白：玩家自行构建完整 Workflow
// ─────────────────────────────────────────────────────────────

export const Level30Meta: LevelMeta = {
	key: 'Level30',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-all', description: 'Eliminate all 8 enemies using the correct strategy for each type', type: 'defeat' }],
	hints: [
		'RED elites (HP=80, TOP): damageEntity is BLOCKED by their shield!',
		'Use spawnFireball(state, direction) to bypass the shield.',
		'Compute direction: normalize(subtract(getEntityPosition(state, eid), playerPos))',
		'GREY drones (HP=30, BOTTOM): normal damageEntity works fine.',
		'Use filter to separate elites from drones, then handle each group differently.',
	],
	// No initialSpellWorkflow — blank editor for synthesis challenge
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

		// 4 red elites (HP=80) in top half — shielded, need fireballs
		const elitePositions = [
			{ x: 160, y: 140 }, { x: 360, y: 130 },
			{ x: 580, y: 140 }, { x: 780, y: 130 },
		]
		for (const pos of elitePositions) {
			this.spawnElite(pos.x, pos.y)
		}

		// 4 grey drones (HP=30) in bottom half — normal enemies
		const dronePositions = [
			{ x: 200, y: 460 }, { x: 400, y: 470 },
			{ x: 600, y: 460 }, { x: 800, y: 470 },
		]
		for (const pos of dronePositions) {
			this.spawnDrone(pos.x, pos.y)
		}

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
					'GREY drones: use damageEntity directly',
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
			'RED elites (HP=80, TOP): Their SHIELD blocks damageEntity!\n' +
			'  → Must use spawnFireball(state, direction) to bypass.\n' +
			'  Direction = normalize(subtract(enemyPos, playerPos))\n\n' +
			'GREY drones (HP=30, BOTTOM): Normal damageEntity works.\n\n' +
			'No scaffolding — build the full spell yourself:\n' +
			'  filter + map + forEach for elites\n' +
			'  filter + forEach for drones\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Combined Assault', [
			'RED elites: use spawnFireball (shield blocks damageEntity)',
			'GREY drones: use damageEntity directly',
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
		const hp = 80
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
		const hp = 30
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
			'  ✓ filter — separated elites from drones\n' +
			'  ✓ map — transformed eids to direction vectors\n' +
			'  ✓ forEach — applied the correct action to each group\n' +
			'  ✓ spawnFireball — bypassed shield with ranged attack\n\n' +
			'One more challenge awaits — the final trial!'
		)
	}
}
