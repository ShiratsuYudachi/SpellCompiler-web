import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 28 — 「近距清场」
//
// 教学目标：空间查询基础 — getNearbyEnemies 按距离筛选
//   playerPos = getEntityPosition(state, getPlayer(state))
//   nearby = getNearbyEnemies(state, playerPos, 150)
//   forEach(nearby, eid → damageEntity(state, eid, 100))
//
// 关键：玩家需要移动到正确位置再施法；位置成为解题变量
// ─────────────────────────────────────────────────────────────

export const Level28Meta: LevelMeta = {
	key: 'Level28',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-left', description: 'Eliminate only the LEFT zone enemies (5 targets)', type: 'defeat' }],
	hints: [
		'Two groups: LEFT zone (targets) and RIGHT zone (protected).',
		'getNearbyEnemies(state, position, radius) returns only enemies within range.',
		'Move your player near the LEFT group, then cast.',
		'getEntityPosition(state, getPlayer(state)) gives your current position.',
		'Hitting right-zone enemies = penalty (3 = failure).',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',    type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			{ id: 'f-gp',  type: 'dynamicFunction', position: { x:   60, y:  80 }, data: { functionName: 'game::getPlayer',          displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',  type: 'dynamicFunction', position: { x:  260, y:  80 }, data: { functionName: 'game::getEntityPosition',   displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-nne', type: 'dynamicFunction', position: { x:  260, y: 200 }, data: { functionName: 'game::getNearbyEnemies',    displayName: 'getNearbyEnemies',  namespace: 'game', params: ['state', 'position', 'radius'] } },
			{ id: 'lit-r', type: 'literal',         position: { x:  100, y: 290 }, data: { value: 150 } },
			{ id: 'f-fe',  type: 'dynamicFunction', position: { x:  520, y: 200 }, data: { functionName: 'list::forEach',             displayName: 'forEach',           namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',   type: 'output',          position: { x:  760, y: 200 }, data: { label: 'Output' } },
			// Lambda
			{ id: 'lam',   type: 'lambdaDef',       position: { x:   60, y: 420 }, data: { functionName: 'hit', params: ['eid'] } },
			{ id: 'f-dmg', type: 'dynamicFunction', position: { x:  250, y: 420 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-100',type: 'literal',        position: { x:  100, y: 520 }, data: { value: 100 } },
			{ id: 'f-out', type: 'functionOut',     position: { x:  480, y: 420 }, data: { lambdaId: 'lam' } },
		],
		edges: [
			{ id: 'e1', source: 'si',     target: 'f-gp',  targetHandle: 'arg0' },
			{ id: 'e2', source: 'si',     target: 'f-pp',  targetHandle: 'arg0' },
			{ id: 'e3', source: 'f-gp',   target: 'f-pp',  targetHandle: 'arg1' },
			{ id: 'e4', source: 'si',     target: 'f-nne', targetHandle: 'arg0' },
			{ id: 'e5', source: 'f-pp',   target: 'f-nne', targetHandle: 'arg1' },
			{ id: 'e6', source: 'lit-r',  target: 'f-nne', targetHandle: 'arg2' },
			{ id: 'e7', source: 'f-nne',  target: 'f-fe',  targetHandle: 'arg0' },
			{ id: 'e8', source: 'f-out',  sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e9', source: 'f-fe',   target: 'out',   targetHandle: 'value' },
			// lambda body
			{ id: 'e10',source: 'si',     target: 'f-dmg', targetHandle: 'arg0' },
			{ id: 'e11',source: 'lam',    sourceHandle: 'param0', target: 'f-dmg', targetHandle: 'arg1' },
			{ id: 'e12',source: 'lit-100',target: 'f-dmg', targetHandle: 'arg2' },
			{ id: 'e13',source: 'f-dmg',  target: 'f-out', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level28Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	isTarget: boolean    // left zone = true (must kill), right zone = false (protected)
	penaltyFired: boolean
}

export class Level28 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private penaltyCount: number = 0
	private levelFailed: boolean = false
	private levelWon: boolean = false

	constructor() { super({ key: 'Level28' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.penaltyCount = 0
		this.levelFailed = false
		this.levelWon = false
		this.events.removeAllListeners('civilian-hit')

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Left zone: targets (green, must eliminate)
		const leftPositions = [{ x: 120, y: 160 }, { x: 220, y: 280 }, { x: 120, y: 400 }, { x: 300, y: 160 }, { x: 280, y: 440 }]
		for (const pos of leftPositions) {
			this.spawnEnemy(pos.x, pos.y, 0x33cc66, 50, true)
		}

		// Right zone: protected enemies (red, penalty on hit)
		const rightPositions = [{ x: 840, y: 160 }, { x: 740, y: 280 }, { x: 840, y: 400 }, { x: 660, y: 160 }, { x: 680, y: 440 }]
		for (const pos of rightPositions) {
			this.spawnEnemy(pos.x, pos.y, 0xff4444, 50, false)
		}

		// Register right-zone as "civilians" for penalty purposes
		const protectedEids = new Set(this.enemies.filter(e => !e.isTarget).map(e => e.eid))
		this.world.resources.levelData!['civilianEids'] = protectedEids

		this.events.on('civilian-hit', (eid?: number) => {
			if (this.levelFailed || this.levelWon) return
			if (typeof eid === 'number') {
				const ent = this.enemies.find(e => e.eid === eid)
				if (ent) ent.penaltyFired = true
			}
			this.penaltyCount++
			this.cameras.main.shake(180, 0.012)
			this.cameras.main.flash(150, 255, 50, 50)
			this.setTaskInfo('Close Range Clear', [
				'Eliminate LEFT zone (green) enemies only',
				'Hitting RIGHT zone = penalty',
				`Penalties: ${this.penaltyCount} / 3`,
			])
			if (this.penaltyCount >= 3) this.onMissionFail()
		})

		// Draw visual zone divider
		const divider = this.add.rectangle(480, 320, 4, 560, 0xffff00, 0.3)
		this.add.text(240, 40, '← TARGET ZONE', { fontSize: '14px', color: '#33cc66', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5)
		this.add.text(720, 40, 'PROTECTED →', { fontSize: '14px', color: '#ff6666', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5)

		this.showInstruction(
			'【Close Range Clear — Spatial Query Basics】\n\n' +
			'GREEN enemies (LEFT) = your targets.\n' +
			'RED enemies (RIGHT) = protected — hitting them = penalty.\n\n' +
			'getNearbyEnemies returns only enemies within a given radius.\n\n' +
			'Walk NEAR the green group, then cast:\n' +
			'  getNearbyEnemies(state, playerPos, 150)\n\n' +
			'Your position determines what gets returned!\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Close Range Clear', [
			'Eliminate LEFT zone (green) enemies only',
			'Hitting RIGHT zone = penalty (3 = fail)',
			`Penalties: 0 / 3`,
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelFailed || this.levelWon) return

		// Fallback penalty for protected enemies
		this.enemies = this.enemies.filter(ent => {
			if (!ent.isTarget && !this.world.resources.bodies.has(ent.eid)) {
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

		// Win: all left-zone targets dead
		const targets = this.enemies.filter(e => e.isTarget)
		if (targets.length > 0 && targets.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, color: number, hp: number, isTarget: boolean): TrackedEnemy {
		const size = 22
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(3, color)
		const label = this.add.text(x, y - size - 10, isTarget ? 'TARGET' : 'PROT', {
			fontSize: '10px', color: isTarget ? '#88ffaa' : '#ff8888', stroke: '#000000', strokeThickness: 2,
		}).setOrigin(0.5)
		const body = createRectBody(this, `enemy28-${x}-${y}`, color, size * 2, size * 2, x, y, 4)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEnemy = { eid, body, marker, label, isTarget, penaltyFired: false }
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('clear-left')
		this.showInstruction(
			'Left zone cleared!\n\n' +
			'getNearbyEnemies — mastered!\n\n' +
			'Spatial queries filter by DISTANCE rather than HP.\n' +
			'Your position becomes part of the spell logic.'
		)
	}

	private onMissionFail(): void {
		if (this.levelFailed) return
		this.levelFailed = true
		this.cameras.main.shake(400, 0.025)
		this.cameras.main.flash(300, 255, 0, 0)
		this.showInstruction('MISSION FAILED — Too many protected enemies hit.\n\nMove closer to the green group before casting.\nRestarting in 3 seconds…')
		this.time.delayedCall(3000, () => this.scene.restart())
	}
}
