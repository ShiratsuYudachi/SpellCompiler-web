import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 31 — 「最终审判」（终极关卡）
//
// 三波攻势：每波清空后自动触发下一波，测试所有核心技能
//
//   Wave 1 — 「直冲阵」
//     5 个蓝色步兵（HP=50），散布在左区
//     → 直接 forEach + damageEntity
//
//   Wave 2 — 「远程狙击」
//     4 个橙色精英（HP=80，位于场地四角附近）
//     → 必须用 map(eid→direction) + forEach(spawnFireball)
//       （onDamage hook：直接 damageEntity 会被护盾反弹）
//
//   Wave 3 — 「混合围攻」
//     8 个敌人围成圆形（红色威胁 HP=80 × 4 + 灰色平民 HP=15 × 4）
//     → getNearbyEnemies(state, playerPos, 200) + filter(HP>40) + forEach(damage)
//
// 编辑器为空白；玩家自行构建每波的 Spell
// ─────────────────────────────────────────────────────────────

export const Level31Meta: LevelMeta = {
	key: 'Level31',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [
		{ id: 'wave1', description: 'Wave 1: Defeat 5 infantry with forEach + damageEntity', type: 'defeat' },
		{ id: 'wave2', description: 'Wave 2: Defeat 4 elites using map + spawnFireball', type: 'defeat' },
		{ id: 'wave3', description: 'Wave 3: Use getNearbyEnemies + filter to clear mixed ring', type: 'defeat' },
	],
	hints: [
		'Wave 1: Simple forEach + damageEntity on all enemies.',
		'Wave 2: Elites have shields! Use map(eid→direction) + forEach(spawnFireball).',
		'Wave 3: 8 enemies in ring — mix of threats (HP=80) and civilians (HP=15).',
		'Wave 3 solution: getNearbyEnemies → filter(HP>40) → forEach(damageEntity).',
		'Cast the spell multiple times — each wave requires a different approach!',
	],
	// No initialSpellWorkflow — blank editor for ultimate synthesis test
}

levelRegistry.register(Level31Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	role: 'infantry' | 'elite' | 'threat' | 'civilian'
	penaltyFired: boolean
}

export class Level31 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private shieldedEids: Set<number> = new Set()
	private currentWave: number = 0
	private penaltyCount: number = 0
	private levelWon: boolean = false
	private levelFailed: boolean = false
	private waveLabel!: Phaser.GameObjects.Text

	constructor() { super({ key: 'Level31' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.shieldedEids = new Set()
		this.currentWave = 0
		this.penaltyCount = 0
		this.levelWon = false
		this.levelFailed = false
		this.events.removeAllListeners('civilian-hit')

		// Wave label UI
		this.waveLabel = this.add.text(480, 16, '', {
			fontSize: '18px',
			color: '#ffffff',
			stroke: '#000000',
			strokeThickness: 4,
			fontStyle: 'bold',
		}).setOrigin(0.5).setDepth(10)

		// onDamage hook: Wave 2 elite shields
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			if (!this.shieldedEids.has(eid)) return
			// Restore HP — shield deflects direct damage
			Health.current[eid] = Math.min(Health.current[eid] + amount, Health.max[eid])
			const ent = this.enemies.find(e => e.eid === eid)
			if (ent) {
				ent.marker.setFillStyle(0xffffff, 1)
				this.time.delayedCall(120, () => {
					if (ent.marker.active) ent.marker.setFillStyle(0xff8800, 0.75)
				})
				this.cameras.main.shake(60, 0.005)
			}
		}

		// Civilian penalty listener
		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.enemies.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(200, 0.015)
			this.cameras.main.flash(150, 255, 50, 50)
			if (this.penaltyCount >= 3) this.onMissionFail()
		})

		// Start Wave 1
		this.startWave1()
	}

	protected onLevelUpdate(): void {
		if (this.levelWon || this.levelFailed) return

		// Civilian penalty fallback (Wave 3)
		this.enemies = this.enemies.filter(ent => {
			if (ent.role === 'civilian' && !this.world.resources.bodies.has(ent.eid)) {
				if (!ent.penaltyFired) {
					ent.penaltyFired = true
					this.events.emit('civilian-hit', ent.eid)
				}
				ent.marker.destroy()
				ent.label.destroy()
				return false
			}
			return true
		})

		// Clean up dead non-civilian enemies
		this.enemies = this.enemies.filter(ent => {
			if (ent.role !== 'civilian' && !this.world.resources.bodies.has(ent.eid)) {
				ent.marker.destroy()
				ent.label.destroy()
				this.shieldedEids.delete(ent.eid)
				return false
			}
			return true
		})

		// Wave completion checks
		if (this.currentWave === 1 && this.enemies.length === 0) {
			this.onWave1Complete()
		} else if (this.currentWave === 2 && this.enemies.length === 0) {
			this.onWave2Complete()
		} else if (this.currentWave === 3) {
			const threats = this.enemies.filter(e => e.role === 'threat')
			if (threats.length > 0 && threats.every(e => !this.world.resources.bodies.has(e.eid))) {
				this.onWave3Complete()
			}
		}
	}

	// ── Wave 1: 5 infantry (blue, HP=50) in left area ──────────────────────

	private startWave1(): void {
		this.currentWave = 1
		this.waveLabel.setText('⚔ WAVE 1 / 3 — Infantry').setColor('#88bbff')

		const positions = [
			{ x: 120, y: 180 }, { x: 240, y: 300 }, { x: 180, y: 420 },
			{ x: 320, y: 160 }, { x: 300, y: 450 },
		]
		for (const pos of positions) {
			this.spawnInfantry(pos.x, pos.y)
		}

		this.showInstruction(
			'【Final Trial — Wave 1/3: Infantry】\n\n' +
			'5 blue infantry (HP=50) in the left zone.\n\n' +
			'Strategy: forEach + damageEntity\n' +
			'  forEach(getAllEnemies(state), eid → damageEntity(state, eid, 100))\n\n' +
			'Clear them to trigger Wave 2!\n\n' +
			'Press SPACE to cast.'
		)
		this.setTaskInfo('Wave 1: Infantry', ['5 blue infantry (HP=50)', 'Strategy: forEach + damageEntity', 'Clear to trigger Wave 2'])
	}

	private onWave1Complete(): void {
		this.completeObjectiveById('wave1')
		this.cameras.main.flash(300, 0, 200, 255)
		this.showInstruction('Wave 1 cleared!\n\nPrepare for Wave 2…\nElites incoming in 2 seconds.')
		this.time.delayedCall(2000, () => {
			if (!this.levelWon && !this.levelFailed) this.startWave2()
		})
	}

	// ── Wave 2: 4 elites (orange, HP=80) at corners — need fireballs ──────────

	private startWave2(): void {
		this.currentWave = 2
		this.waveLabel.setText('⚔ WAVE 2 / 3 — Elites (Shielded)').setColor('#ffaa44')

		const positions = [
			{ x: 140, y: 120 }, { x: 820, y: 120 },
			{ x: 140, y: 500 }, { x: 820, y: 500 },
		]
		for (const pos of positions) {
			this.spawnElite(pos.x, pos.y)
		}

		this.showInstruction(
			'【Wave 2/3: Shielded Elites】\n\n' +
			'4 orange elites (HP=80) at the corners.\n' +
			'Their shields BLOCK direct damageEntity!\n\n' +
			'Strategy: map + spawnFireball\n' +
			'  dirs = map(enemies, eid → normalize(subtract(pos(eid), playerPos)))\n' +
			'  forEach(dirs, dir → spawnFireball(state, dir))\n\n' +
			'Clear them to trigger the final wave!\n\n' +
			'Press SPACE to cast.'
		)
		this.setTaskInfo('Wave 2: Elites', ['4 orange elites — shields active', 'Strategy: map + spawnFireball', 'Clear to trigger Wave 3'])
	}

	private onWave2Complete(): void {
		this.completeObjectiveById('wave2')
		this.cameras.main.flash(300, 255, 150, 0)
		this.showInstruction('Wave 2 cleared!\n\nFinal wave incoming…\nMixed ring in 2 seconds!')
		this.time.delayedCall(2000, () => {
			if (!this.levelWon && !this.levelFailed) this.startWave3()
		})
	}

	// ── Wave 3: 8 in ring (4 red threats + 4 grey civilians) ──────────────────

	private startWave3(): void {
		this.currentWave = 3
		this.waveLabel.setText('⚔ WAVE 3 / 3 — Mixed Ring (FINAL)').setColor('#ff6666')

		// Register civilians before spawning
		this.events.removeAllListeners('civilian-hit')
		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.enemies.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(200, 0.015)
			this.cameras.main.flash(150, 255, 50, 50)
			this.setTaskInfo('Wave 3: Final — Mixed Ring', [
				'getNearbyEnemies → filter(HP>40) → forEach',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) this.onMissionFail()
		})

		const cx = 480, cy = 320, R = 150
		// Red threats at cardinal angles
		const threatAngles = [0, 90, 180, 270]
		const civEids: number[] = []
		for (const deg of threatAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			this.spawnThreat(x, y)
		}
		// Grey civilians at diagonal angles
		const civAngles = [45, 135, 225, 315]
		for (const deg of civAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			const tracked = this.spawnCivilian(x, y)
			civEids.push(tracked.eid)
		}

		this.world.resources.levelData!['civilianEids'] = new Set(civEids)

		// Visual ring
		this.add.circle(cx, cy, R, 0xff4444, 0).setStrokeStyle(2, 0xff4444, 0.3)
		this.add.text(cx, cy + R + 18, 'radius ≈ 200', {
			fontSize: '11px', color: '#ff8888', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)

		this.showInstruction(
			'【Wave 3/3: Mixed Ring — FINAL】\n\n' +
			'8 enemies in a ring:\n' +
			'  RED (cardinal) = threats (HP=80) — must kill!\n' +
			'  GREY (diagonal) = civilians (HP=15) — PENALTY on hit!\n\n' +
			'Strategy: Spatial + Filter\n' +
			'  inRange = getNearbyEnemies(state, playerPos, 200)\n' +
			'  targets = filter(inRange, eid → gt(hp(eid), 40))\n' +
			'  forEach(targets, eid → damageEntity(state, eid, 100))\n\n' +
			'Move to center, then cast. You can do this!\n\n' +
			'Press SPACE to cast.'
		)
		this.setTaskInfo('Wave 3: Final — Mixed Ring', [
			'getNearbyEnemies → filter(HP>40) → forEach',
			`Penalties: ${this.penaltyCount} / 3`,
		])
	}

	private onWave3Complete(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.completeObjectiveById('wave3')
		this.cameras.main.flash(800, 0, 255, 100)
		this.cameras.main.shake(300, 0.01)
		this.waveLabel.setText('✓ ALL WAVES CLEARED!').setColor('#00ff88')
		this.showInstruction(
			'🏆 FINAL TRIAL COMPLETE! 🏆\n\n' +
			'You have mastered the Spell Compiler:\n\n' +
			'  Wave 1 ✓ forEach + damageEntity\n' +
			'  Wave 2 ✓ map(directions) + spawnFireball\n' +
			'  Wave 3 ✓ getNearbyEnemies + filter + forEach\n\n' +
			'These functional patterns — map, filter, fold, forEach —\n' +
			'are not just game mechanics.\n\n' +
			'They are the foundations of functional programming\n' +
			'used in every modern language and framework.\n\n' +
			'Congratulations, Arcane Engineer!'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilians hit.\n\n' +
			'Use filter(nearby, eid → gt(hp(eid), 40)) to\n' +
			'select only threats before casting.\n\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}

	// ── Spawn helpers ──────────────────────────────────────────────────────────

	private spawnInfantry(x: number, y: number): TrackedEnemy {
		const size = 18
		const color = 0x4488ff
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(2, color)
		const label = this.add.text(x, y - size - 10, 'INF', {
			fontSize: '10px', color: '#88aaff', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)
		const body = createRectBody(this, `inf31-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = 50
		Health.current[eid] = 50
		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'infantry', penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}

	private spawnElite(x: number, y: number): TrackedEnemy {
		const size = 22
		const color = 0xff8800
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(4, 0xffdd00)
		const label = this.add.text(x, y - size - 12, 'ELITE🛡', {
			fontSize: '10px', color: '#ffcc44', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `elite31-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = 80
		Health.current[eid] = 80
		this.shieldedEids.add(eid)
		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'elite', penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}

	private spawnThreat(x: number, y: number): TrackedEnemy {
		const size = 22
		const color = 0xff4444
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(3, color)
		const label = this.add.text(x, y - size - 10, 'THREAT', {
			fontSize: '10px', color: '#ff8888', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)
		const body = createRectBody(this, `threat31-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = 80
		Health.current[eid] = 80
		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'threat', penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}

	private spawnCivilian(x: number, y: number): TrackedEnemy {
		const size = 14
		const color = 0x888888
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(2, 0xaaaaaa)
		const label = this.add.text(x, y - size - 10, 'CIV', {
			fontSize: '10px', color: '#aaaaaa', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)
		const body = createRectBody(this, `civ31-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = 15
		Health.current[eid] = 15
		const tracked: TrackedEnemy = { eid, body, marker, label, role: 'civilian', penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}
}
