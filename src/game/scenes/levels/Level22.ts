import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 22 — 「扫荡令」
//
// 教学目标：forEach 基础
//   forEach(getAllEnemies(state), eid → damageEntity(state, eid, 100))
//
// 场景：6 个相同 HP 的敌人，玩家锁定中心
// 问题：damageEntity 只打单个目标——必须遍历所有
// ─────────────────────────────────────────────────────────────

export const Level22Meta: LevelMeta = {
	key: 'Level22',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-all', description: 'Eliminate ALL 6 enemies using forEach', type: 'defeat' }],
	hints: [
		'getAllEnemies returns a LIST of all enemies — not just one.',
		'forEach(list, f) calls f on every element in the list.',
		'Build a lambda: eid → damageEntity(state, eid, 100)',
		'Connect the lambda\'s functionOut (function handle) to forEach\'s second argument.',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',       type: 'spellInput',      position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			{ id: 'f-gae',    type: 'dynamicFunction',  position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-fe',     type: 'dynamicFunction',  position: { x:  300, y: 200 }, data: { functionName: 'list::forEach',      displayName: 'forEach',       namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',      type: 'output',           position: { x:  540, y: 200 }, data: { label: 'Output' } },
			// Lambda body
			{ id: 'lam',      type: 'lambdaDef',        position: { x:   60, y: 420 }, data: { functionName: 'doAction', params: ['eid'] } },
			{ id: 'f-dmg',    type: 'dynamicFunction',  position: { x:  250, y: 420 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-100',  type: 'literal',          position: { x:  100, y: 540 }, data: { value: 100 } },
			{ id: 'f-out',    type: 'functionOut',      position: { x:  480, y: 420 }, data: { lambdaId: 'lam' } },
		],
		edges: [
			{ id: 'e1', source: 'si',     target: 'f-gae', targetHandle: 'arg0' },
			{ id: 'e2', source: 'f-gae',  target: 'f-fe',  targetHandle: 'arg0' },
			{ id: 'e3', source: 'f-out',  sourceHandle: 'function', target: 'f-fe', targetHandle: 'arg1' },
			{ id: 'e4', source: 'f-fe',   target: 'out',   targetHandle: 'value' },
			// Lambda body edges
			{ id: 'e5', source: 'si',     target: 'f-dmg', targetHandle: 'arg0' },
			{ id: 'e6', source: 'lam',    sourceHandle: 'param0', target: 'f-dmg', targetHandle: 'arg1' },
			{ id: 'e7', source: 'lit-100',target: 'f-dmg', targetHandle: 'arg2' },
			{ id: 'e8', source: 'f-dmg',  target: 'f-out', targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level22Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
}

export class Level22 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private levelWon: boolean = false

	constructor() { super({ key: 'Level22' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.levelWon = false

		this.showInstruction(
			'【Sweep Order — forEach Basics】\n\n' +
			'Six enemies stand in your way. A single spell must eliminate them ALL.\n\n' +
			'getAllEnemies returns a LIST — not just one enemy.\n' +
			'forEach(list, f) calls f on every element in the list.\n\n' +
			'The pre-built spell is already correct:\n' +
			'  forEach(enemies, eid → damageEntity(state, eid, 100))\n\n' +
			'Press SPACE to cast and watch it work, then try modifying it.'
		)

		this.setTaskInfo('Sweep Order', [
			'Eliminate ALL 6 enemies',
			'Use forEach to hit each one',
			'One spell cast, six targets',
		])

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		const positions = [
			{ x: 160, y: 160 }, { x: 480, y: 140 }, { x: 800, y: 160 },
			{ x: 160, y: 480 }, { x: 480, y: 500 }, { x: 800, y: 480 },
		]
		for (const pos of positions) {
			this.spawnEnemy(pos.x, pos.y, 0xee4444, 50)
		}
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update HP labels
		for (const ent of this.enemies) {
			if (this.world.resources.bodies.has(ent.eid) && ent.label.active) {
				ent.label.setText(`HP: ${Math.max(0, Health.current[ent.eid])}`)
			}
		}

		// Win: all enemies despawned
		if (this.enemies.length > 0 && this.enemies.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, color: number, hp: number): TrackedEnemy {
		const size = 26
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(3, color)
		const label = this.add.text(x, y - size - 12, `HP: ${hp}`, {
			fontSize: '12px', color: '#ffffff', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `enemy22-${x}-${y}`, color, size * 2, size * 2, x, y, 5)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEnemy = { eid, body, marker, label }
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('clear-all')
		this.showInstruction(
			'All enemies eliminated!\n\n' +
			'forEach — mastered!\n\n' +
			'forEach(list, f) applies f to EVERY element.\n' +
			'Perfect for side-effect operations like dealing damage.'
		)
	}
}
