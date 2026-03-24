import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import { EntityVisualManager } from '../../EntityVisual'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 20 — "Precision Lockdown"
//
// Teaching goal: getNearbyEnemies then filter
//   8 enemies in radius 150, but 4 are civilians (HP=15)
//   getNearbyEnemies alone hits everyone
//   Add filter(eid → gt(hp(eid), 40)) to isolate threats
//
//   inRange  = getNearbyEnemies(state, playerPos, 150)
//   targets  = filter(inRange, eid → gt(getEntityHealth(state, eid), 40))
//   forEach(targets, eid → damageEntity(state, eid, 100))
// ─────────────────────────────────────────────────────────────

const _answer: { nodes: any[]; edges: any[] } = {
		nodes: [
			{ id: 'si',      type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			// getPlayer → getEntityPosition (player pos)
			{ id: 'f-gp',    type: 'dynamicFunction', position: { x:   60, y:  60 }, data: { functionName: 'game::getPlayer',        displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',    type: 'dynamicFunction', position: { x:  260, y:  60 }, data: { functionName: 'game::getEntityPosition', displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			// getNearbyEnemies
			{ id: 'f-nne',   type: 'dynamicFunction', position: { x:  260, y: 200 }, data: { functionName: 'game::getNearbyEnemies', displayName: 'getNearbyEnemies',  namespace: 'game', params: ['state', 'position', 'radius'] } },
			{ id: 'lit-r',   type: 'literal',         position: { x:  100, y: 300 }, data: { value: 150 } },
			// filter: only HP > 40 (threats)
			{ id: 'f-filt',  type: 'dynamicFunction', position: { x:  500, y: 200 }, data: { functionName: 'list::filter',           displayName: 'filter(threats)',   namespace: 'list', params: ['l', 'pred'] } },
			{ id: 'lam-p',   type: 'lambdaDef',       position: { x:  340, y: 400 }, data: { functionName: 'isThreat', params: ['eid'] } },
			{ id: 'f-hp',    type: 'dynamicFunction', position: { x:  480, y: 460 }, data: { functionName: 'game::getEntityHealth',  displayName: 'getEntityHealth',   namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-gt',    type: 'dynamicFunction', position: { x:  650, y: 460 }, data: { functionName: 'std::cmp::gt',           displayName: '> gt',              namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-40',  type: 'literal',         position: { x:  530, y: 570 }, data: { value: 40 } },
			{ id: 'fout-p',  type: 'functionOut',     position: { x:  820, y: 400 }, data: { lambdaId: 'lam-p' } },
			// forEach: damage threats
			{ id: 'f-fe',    type: 'dynamicFunction', position: { x:  760, y: 200 }, data: { functionName: 'list::forEach',          displayName: 'forEach',           namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',     type: 'output',          position: { x: 1000, y: 200 }, data: { label: 'Output' } },
			{ id: 'lam-d',   type: 'lambdaDef',       position: { x:  580, y: 680 }, data: { functionName: 'hit', params: ['eid'] } },
			{ id: 'f-dmg',   type: 'dynamicFunction', position: { x:  740, y: 740 }, data: { functionName: 'game::damageEntity',     displayName: 'damageEntity',      namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-100', type: 'literal',         position: { x:  640, y: 840 }, data: { value: 100 } },
			{ id: 'fout-d',  type: 'functionOut',     position: { x:  960, y: 680 }, data: { lambdaId: 'lam-d' } },
		],
		edges: [
			// getPlayer → getEntityPosition
			{ id: 'e1',  source: 'si',      target: 'f-gp',   targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',      target: 'f-pp',   targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-gp',    target: 'f-pp',   targetHandle: 'arg1' },
			// getNearbyEnemies
			{ id: 'e4',  source: 'si',      target: 'f-nne',  targetHandle: 'arg0' },
			{ id: 'e5',  source: 'f-pp',    target: 'f-nne',  targetHandle: 'arg1' },
			{ id: 'e6',  source: 'lit-r',   target: 'f-nne',  targetHandle: 'arg2' },
			// filter
			{ id: 'e7',  source: 'f-nne',   target: 'f-filt', targetHandle: 'arg0' },
			{ id: 'e8',  source: 'fout-p',  sourceHandle: 'function', target: 'f-filt', targetHandle: 'arg1' },
			// forEach
			{ id: 'e9',  source: 'f-filt',  target: 'f-fe',   targetHandle: 'arg0' },
			{ id: 'e10', source: 'fout-d',  sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e11', source: 'f-fe',    target: 'out',    targetHandle: 'value' },
			// predicate lambda body
			{ id: 'e12', source: 'si',      target: 'f-hp',   targetHandle: 'arg0' },
			{ id: 'e13', source: 'lam-p',   sourceHandle: 'param0', target: 'f-hp', targetHandle: 'arg1' },
			{ id: 'e14', source: 'f-hp',    target: 'f-gt',   targetHandle: 'arg0' },
			{ id: 'e15', source: 'lit-40',  target: 'f-gt',   targetHandle: 'arg1' },
			{ id: 'e16', source: 'f-gt',    target: 'fout-p', targetHandle: 'value' },
			// damage lambda body
			{ id: 'e17', source: 'si',      target: 'f-dmg',  targetHandle: 'arg0' },
			{ id: 'e18', source: 'lam-d',   sourceHandle: 'param0', target: 'f-dmg', targetHandle: 'arg1' },
			{ id: 'e19', source: 'lit-100', target: 'f-dmg',  targetHandle: 'arg2' },
			{ id: 'e20', source: 'f-dmg',   target: 'fout-d', targetHandle: 'value' },
		],
	};

export const Level19Meta: LevelMeta = {
	key: 'Level19',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-threats', description: 'Eliminate 4 red threats WITHOUT hitting grey civilians', type: 'defeat' }],
	hints: [
		'All 8 enemies are within getNearbyEnemies radius 150 from center.',
		'getNearbyEnemies does NOT distinguish by type — returns ALL in range!',
		'Add a filter AFTER getNearbyEnemies: filter(nearby, eid → gt(hp(eid), 40))',
		'Grey enemies (HP=15) are civilians — hitting them = penalty.',
		'Solution: getNearbyEnemies → filter(HP>40) → forEach(damageEntity)',
	],
	initialSpellWorkflow: _answer,
	answerSpellWorkflow: _answer,
}

levelRegistry.register(Level19Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	role: 'threat' | 'civilian'
	penaltyFired: boolean
}

export class Level19 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false
	private visuals!: EntityVisualManager

	constructor() { super({ key: 'Level19' }) }

	protected onLevelCreate(): void {
		if (this.visuals) this.visuals.destroyAll()
		this.visuals = new EntityVisualManager(this)

		this.enemies = []
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit')

		// Lock player at center
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		const cx = 480, cy = 320, R = 130

		// 4 red threats at cardinal angles (0°, 90°, 180°, 270°) — HP=80
		const threatAngles = [0, 90, 180, 270]
		for (const deg of threatAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			this.spawnEnemy(x, y, 0xff4444, 80, 'threat')
		}

		// 4 grey civilians at diagonal angles (45°, 135°, 225°, 315°) — HP=15
		const civAngles = [45, 135, 225, 315]
		for (const deg of civAngles) {
			const rad = (deg * Math.PI) / 180
			const x = Math.round(cx + R * Math.cos(rad))
			const y = Math.round(cy + R * Math.sin(rad))
			this.spawnEnemy(x, y, 0x888888, 15, 'civilian')
		}

		// Register grey enemies as civilians for penalty
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
			this.setTaskInfo('Precision Lockdown', [
				'Destroy RED threats (HP=80) ONLY',
				'GREY civilians (HP=15) = protected',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) this.onMissionFail()
		})

		// Visual: circle outline + center dot
		this.add.circle(cx, cy, R, 0x4444ff, 0).setStrokeStyle(2, 0x4444bb, 0.5)
		this.add.circle(cx, cy, 6, 0xffffff, 0.6)
		this.add.text(cx, cy + R + 20, `radius = 150`, {
			fontSize: '11px', color: '#8888ff', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)

		this.showInstruction(
			'【Precision Lockdown — Spatial + Filter】\n\n' +
			'8 enemies arranged in a circle — ALL within radius 150.\n' +
			'RED (cardinal) = threats (HP=80) — must eliminate.\n' +
			'GREY (diagonal) = civilians (HP=15) — penalty on hit!\n\n' +
			'getNearbyEnemies returns EVERYONE in range.\n' +
			'You must FILTER the result:\n' +
			'  filter(nearby, eid → gt(getEntityHealth(state, eid), 40))\n\n' +
			'Then forEach(threats, eid → damageEntity(state, eid, 100))\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Precision Lockdown', [
			'Destroy RED threats (HP=80) ONLY',
			'GREY civilians (HP=15) = protected',
			`Penalties: 0 / 3`,
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Lock player at center
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update alive entities; destroy dead, emit civilian penalty if needed
		this.enemies = this.enemies.filter(ent => {
			if (!this.world.resources.bodies.has(ent.eid)) {
				if (ent.role === 'civilian' && !ent.penaltyFired) {
					ent.penaltyFired = true
					this.events.emit('civilian-hit', ent.eid)
				}
				this.visuals.destroy(ent.eid)
				return false
			}
			this.visuals.update(ent.eid, Health.current[ent.eid])
			return true
		})

		// Win: all threats dead
		const threats = this.enemies.filter(e => e.role === 'threat')
		if (threats.length > 0 && threats.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, color: number, hp: number, role: 'threat' | 'civilian'): TrackedEnemy {
		const size = role === 'threat' ? 22 : 16
		const body = createRectBody(this, `enemy20-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		body.setAlpha(0)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp

		this.visuals.register(eid, {
			role: role === 'threat' ? 'target' : 'civilian',
			x,
			y,
			radius: size,
			bodyColor: color,
			maxHP: hp,
		})

		const tracked: TrackedEnemy = { eid, body, role, penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('clear-threats')
		this.showInstruction(
			'Threats eliminated!\n\n' +
			'KEY INSIGHT: getNearbyEnemies + filter = precision spatial query.\n\n' +
			'You cannot rely on proximity alone — sometimes the battlefield mixes\n' +
			'targets and civilians at the same distance.\n\n' +
			'Always compose: spatial query → type filter → action.'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction(
			'MISSION FAILED — Too many civilians hit.\n\n' +
			'getNearbyEnemies returns ALL enemies in range — including civilians.\n' +
			'Add filter(nearby, eid → gt(hp(eid), 40)) to select only threats.\n\n' +
			'Restarting in 3 seconds…'
		)
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
