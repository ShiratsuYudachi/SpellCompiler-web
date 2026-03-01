import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 27 — 「精准打击」
//
// 教学目标：filter + map + forEach 完整组合（单管道）
//   threats = filter(getAllEnemies(state), eid → gt(hp(eid), 60))
//   dirs    = map(threats, eid → normalize(subtract(pos(eid), playerPos)))
//   forEach(dirs, dir → spawnFireball(state, playerPos, dir))
//
// 场景：4个红色威胁（HP=80，位于正方向N/S/E/W）
//       4个灰色平民（HP=20，位于斜方向NE/NW/SE/SW）
// 机制：不使用 filter 直接开火 → 全部8个方向都有火球 → 平民被波及 → 惩罚
//       正确 filter 后只有4个正方向火球 → 平民安全
// ─────────────────────────────────────────────────────────────

export const Level27Meta: LevelMeta = {
	key: 'Level27',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-threats', description: 'Destroy 4 red threats — filter before firing!', type: 'defeat' }],
	hints: [
		'RED enemies (HP=80, N/S/E/W) = threats — must kill with fireballs.',
		'GREY enemies (HP=20, diagonal) = civilians — penalty if hit!',
		'getAllEnemies returns ALL 8 — you MUST filter first.',
		'filter(enemies, eid → gt(hp(eid), 60)) keeps only threats (HP=80 > 60).',
		'Then: map(threats, eid → normalize(pos(eid)−playerPos)) → forEach(spawnFireball)',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',      type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			// player position
			{ id: 'f-gp',    type: 'dynamicFunction', position: { x:   60, y:  60 }, data: { functionName: 'game::getPlayer',          displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',    type: 'dynamicFunction', position: { x:  260, y:  60 }, data: { functionName: 'game::getEntityPosition',   displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			// getAllEnemies → filter(hp > 60)
			{ id: 'f-gae',   type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-filt',  type: 'dynamicFunction', position: { x:  280, y: 200 }, data: { functionName: 'list::filter', displayName: 'filter(threats)', namespace: 'list', params: ['l', 'pred'] } },
			// filter lambda: isHostile(eid) = gt(hp(eid), 60)
			{ id: 'lam-f',   type: 'lambdaDef',       position: { x:  100, y: 420 }, data: { functionName: 'isHostile', params: ['eid'] } },
			{ id: 'f-hp',    type: 'dynamicFunction', position: { x:  250, y: 480 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-gt',    type: 'dynamicFunction', position: { x:  440, y: 480 }, data: { functionName: 'std::cmp::gt', displayName: '> gt', namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-60',  type: 'literal',         position: { x:  320, y: 580 }, data: { value: 60 } },
			{ id: 'fout-f',  type: 'functionOut',     position: { x:  620, y: 420 }, data: { lambdaId: 'lam-f' } },
			// map(threats, eid → dir)
			{ id: 'f-map',   type: 'dynamicFunction', position: { x:  500, y: 200 }, data: { functionName: 'list::map', displayName: 'map(eid→dir)', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-d',   type: 'lambdaDef',       position: { x:  480, y: 680 }, data: { functionName: 'toDir', params: ['eid'] } },
			{ id: 'f-ep',    type: 'dynamicFunction', position: { x:  640, y: 740 }, data: { functionName: 'game::getEntityPosition', displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-sub',   type: 'dynamicFunction', position: { x:  820, y: 740 }, data: { functionName: 'vec::subtract',  displayName: 'subtract', namespace: 'vec', params: ['a', 'b'] } },
			{ id: 'f-norm',  type: 'dynamicFunction', position: { x:  990, y: 740 }, data: { functionName: 'vec::normalize', displayName: 'normalize', namespace: 'vec', params: ['v'] } },
			{ id: 'fout-d',  type: 'functionOut',     position: { x: 1150, y: 680 }, data: { lambdaId: 'lam-d' } },
			// forEach(dirs, dir → spawnFireball)
			{ id: 'f-fe',    type: 'dynamicFunction', position: { x:  720, y: 200 }, data: { functionName: 'list::forEach', displayName: 'forEach(fireball)', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-fb',  type: 'lambdaDef',       position: { x:  720, y: 100 }, data: { functionName: 'shoot', params: ['dir'] } },
			{ id: 'f-fb',    type: 'dynamicFunction', position: { x:  890, y: 100 }, data: { functionName: 'game::spawnFireball', displayName: 'spawnFireball', namespace: 'game', params: ['state', 'position', 'direction'] } },
			{ id: 'fout-fb', type: 'functionOut',     position: { x: 1090, y: 100 }, data: { lambdaId: 'lam-fb' } },
			{ id: 'out',     type: 'output',          position: { x:  960, y: 200 }, data: { label: 'Output' } },
		],
		edges: [
			// player pos
			{ id: 'e1',  source: 'si',     target: 'f-gp',   targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',     target: 'f-pp',   targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-gp',   target: 'f-pp',   targetHandle: 'arg1' },
			// getAllEnemies → filter
			{ id: 'e4',  source: 'si',     target: 'f-gae',  targetHandle: 'arg0' },
			{ id: 'e5',  source: 'f-gae',  target: 'f-filt', targetHandle: 'arg0' },
			{ id: 'e6',  source: 'fout-f', sourceHandle: 'function', target: 'f-filt', targetHandle: 'arg1' },
			// filter lambda body
			{ id: 'e7',  source: 'si',     target: 'f-hp',   targetHandle: 'arg0' },
			{ id: 'e8',  source: 'lam-f',  sourceHandle: 'param0', target: 'f-hp',   targetHandle: 'arg1' },
			{ id: 'e9',  source: 'f-hp',   target: 'f-gt',   targetHandle: 'arg0' },
			{ id: 'e10', source: 'lit-60', target: 'f-gt',   targetHandle: 'arg1' },
			{ id: 'e11', source: 'f-gt',   target: 'fout-f', targetHandle: 'value' },
			// filter → map
			{ id: 'e12', source: 'f-filt', target: 'f-map',  targetHandle: 'arg0' },
			{ id: 'e13', source: 'fout-d', sourceHandle: 'function', target: 'f-map', targetHandle: 'arg1' },
			// map lambda body: normalize(pos(eid) - playerPos)
			{ id: 'e14', source: 'si',     target: 'f-ep',   targetHandle: 'arg0' },
			{ id: 'e15', source: 'lam-d',  sourceHandle: 'param0', target: 'f-ep',   targetHandle: 'arg1' },
			{ id: 'e16', source: 'f-ep',   target: 'f-sub',  targetHandle: 'arg0' },
			{ id: 'e17', source: 'f-pp',   target: 'f-sub',  targetHandle: 'arg1' },
			{ id: 'e18', source: 'f-sub',  target: 'f-norm', targetHandle: 'arg0' },
			{ id: 'e19', source: 'f-norm', target: 'fout-d', targetHandle: 'value' },
			// map → forEach
			{ id: 'e20', source: 'f-map',  target: 'f-fe',   targetHandle: 'arg0' },
			{ id: 'e21', source: 'fout-fb',sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			// forEach lambda body: spawnFireball(state, playerPos, dir)
			{ id: 'e22', source: 'si',     target: 'f-fb',   targetHandle: 'arg0' },
			{ id: 'e23', source: 'f-pp',   target: 'f-fb',   targetHandle: 'arg1' },
			{ id: 'e24', source: 'lam-fb', sourceHandle: 'param0', target: 'f-fb',   targetHandle: 'arg2' },
			{ id: 'e25', source: 'f-fb',   target: 'fout-fb',targetHandle: 'value' },
			// forEach → output
			{ id: 'e26', source: 'f-fe',   target: 'out',    targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level27Meta)

type EnemyRole = 'threat' | 'civilian'

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	role: EnemyRole
	penaltyFired: boolean
}

export class Level27 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() { super({ key: 'Level27' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit')

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		const cx = 480, cy = 320, R = 180

		// 4 red threats at cardinal angles — HP=80
		const threatAngles = [0, 90, 180, 270]
		for (const deg of threatAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			this.spawnEnemy(x, y, 0xff3333, 80, 'threat')
		}

		// 4 grey civilians at diagonal angles — HP=20
		const civAngles = [45, 135, 225, 315]
		for (const deg of civAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			this.spawnEnemy(x, y, 0x888888, 20, 'civilian')
		}

		// Register civilians for penalty detection
		const civEids = new Set(this.enemies.filter(e => e.role === 'civilian').map(e => e.eid))
		this.world.resources.levelData!['civilianEids'] = civEids

		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.enemies.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 50, 50)
			this.setTaskInfo('Precision Strike', [
				'Destroy 4 RED threats (N/S/E/W, HP=80)',
				'GREY civilians (diagonal, HP=20) = protected',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) this.onMissionFail()
		})

		// Visual: ring + center dot + angle labels
		this.add.circle(cx, cy, R, 0x4444ff, 0).setStrokeStyle(1, 0x4444bb, 0.3)
		this.add.circle(cx, cy, 6, 0xffffff, 0.5)

		this.showInstruction(
			'【Precision Strike — filter + map + forEach】\n\n' +
			'RED (N/S/E/W, HP=80) = threats — must eliminate.\n' +
			'GREY (NE/NW/SE/SW, HP=20) = civilians — penalty on hit!\n\n' +
			'getAllEnemies returns ALL 8 — filter BEFORE mapping:\n' +
			'  threats = filter(enemies, eid → gt(hp(eid), 60))\n' +
			'  dirs    = map(threats, eid → normalize(pos(eid)−playerPos))\n' +
			'  forEach(dirs, dir → spawnFireball(state, playerPos, dir))\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Precision Strike', [
			'Destroy 4 RED threats (N/S/E/W, HP=80)',
			'GREY civilians (diagonal, HP=20) = protected',
			'Penalties: 0 / 3',
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player at center
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update HP labels
		for (const ent of this.enemies) {
			if (this.world.resources.bodies.has(ent.eid) && ent.label.active) {
				ent.label.setText(`HP:${Math.max(0, Health.current[ent.eid])}`)
			}
		}

		// Detect dead civilians → penalty
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

		// Win: all 4 threats dead
		const threats = this.enemies.filter(e => e.role === 'threat')
		if (threats.length > 0 && threats.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, color: number, hp: number, role: EnemyRole): TrackedEnemy {
		const size = role === 'threat' ? 28 : 18
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(3, color)
		if (role === 'threat') {
			this.tweens.add({ targets: marker, alpha: 0.5, duration: 700, yoyo: true, repeat: -1 })
		}
		const label = this.add.text(x, y - size - 12, `HP:${hp}`, {
			fontSize: '11px',
			color: role === 'threat' ? '#ff8888' : '#aaaaaa',
			stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const roleTag = this.add.text(x, y + size + 8,
			role === 'threat' ? 'THREAT' : 'CIV', {
				fontSize: '9px',
				color: role === 'threat' ? '#ff6666' : '#888888',
				stroke: '#000000', strokeThickness: 2,
			}).setOrigin(0.5)

		const body = createRectBody(this, `enemy27-${role}-${x}-${y}`, color, size * 2, size * 2, x, y, role === 'threat' ? 5 : 2)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp

		const tracked: TrackedEnemy = { eid, body, marker, label, role, penaltyFired: false }
		// Store roleTag for cleanup
		;(tracked as any).roleTag = roleTag
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 100, 200, 255)
		this.completeObjectiveById('clear-threats')
		this.showInstruction(
			'Precision Strike — cleared!\n\n' +
			`Civilian penalties: ${this.penaltyCount}/3\n\n` +
			'filter + map + forEach mastered:\n' +
			'  filter selects the right targets,\n' +
			'  map converts entities → directions,\n' +
			'  forEach fires at each direction.'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilian casualties.\n\n' +
			'Filter enemies BEFORE mapping to directions:\n' +
			'  filter(enemies, eid → gt(hp(eid), 60))\n\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
