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
// Level 25 — "Guided Fireball"
//
// Teaching goal: map basics — type transform List<eid> → List<Vector2D>
//   playerPos = getEntityPosition(state, getPlayer(state))
//   dirs = map(getAllEnemies(state),
//              eid → normalize(subtract(getEntityPosition(state, eid), playerPos)))
//   forEach(dirs, dir → spawnFireball(state, playerPos, dir))
//
// Key: enemy positions random each time → fixed directions fail → must compute dynamically
// ─────────────────────────────────────────────────────────────

const _answer: { nodes: any[]; edges: any[] } = {
		nodes: [
			{ id: 'si',       type: 'spellInput',     position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
			// Get player position
			{ id: 'f-gp',     type: 'dynamicFunction', position: { x:   60, y:  80 }, data: { functionName: 'game::getPlayer',          displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',     type: 'dynamicFunction', position: { x:  250, y:  80 }, data: { functionName: 'game::getEntityPosition',   displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			// Main chain
			{ id: 'f-gae',    type: 'dynamicFunction', position: { x:   60, y: 200 }, data: { functionName: 'game::getAllEnemies',        displayName: 'getAllEnemies',      namespace: 'game', params: ['state'] } },
			{ id: 'f-map',    type: 'dynamicFunction', position: { x:  280, y: 200 }, data: { functionName: 'list::map',                  displayName: 'map',               namespace: 'list', params: ['l', 'f'] } },
			{ id: 'f-fe',     type: 'dynamicFunction', position: { x:  520, y: 200 }, data: { functionName: 'list::forEach',              displayName: 'forEach',           namespace: 'list', params: ['l', 'f'] } },
			{ id: 'out',      type: 'output',          position: { x:  760, y: 200 }, data: { label: 'Output' } },
			// Lambda 1: eid → direction
			{ id: 'lam1',     type: 'lambdaDef',       position: { x:   60, y: 440 }, data: { functionName: 'toDir', params: ['eid'] } },
			{ id: 'f-ep',     type: 'dynamicFunction', position: { x:  220, y: 520 }, data: { functionName: 'game::getEntityPosition',   displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-sub',    type: 'dynamicFunction', position: { x:  420, y: 520 }, data: { functionName: 'vec::subtract',             displayName: 'subtract',          namespace: 'vec',  params: ['a', 'b'] } },
			{ id: 'f-norm',   type: 'dynamicFunction', position: { x:  600, y: 520 }, data: { functionName: 'vec::normalize',            displayName: 'normalize',         namespace: 'vec',  params: ['v'] } },
			{ id: 'f-out1',   type: 'functionOut',     position: { x:  760, y: 520 }, data: { lambdaId: 'lam1' } },
			// Lambda 2: dir → spawnFireball
			{ id: 'lam2',     type: 'lambdaDef',       position: { x:   60, y: 700 }, data: { functionName: 'shoot', params: ['dir'] } },
			{ id: 'f-fb',     type: 'dynamicFunction', position: { x:  300, y: 700 }, data: { functionName: 'game::spawnFireball',       displayName: 'spawnFireball',     namespace: 'game', params: ['state', 'position', 'direction'] } },
			{ id: 'f-out2',   type: 'functionOut',     position: { x:  560, y: 700 }, data: { lambdaId: 'lam2' } },
		],
		edges: [
			// player position
			{ id: 'e1',  source: 'si',    target: 'f-gp',  targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',    target: 'f-pp',  targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-gp',  target: 'f-pp',  targetHandle: 'arg1' },
			// main chain
			{ id: 'e4',  source: 'si',    target: 'f-gae', targetHandle: 'arg0' },
			{ id: 'e5',  source: 'f-gae', target: 'f-map', targetHandle: 'arg0' },
			{ id: 'e6',  source: 'f-out1',sourceHandle: 'function', target: 'f-map', targetHandle: 'arg1' },
			{ id: 'e7',  source: 'f-map', target: 'f-fe',  targetHandle: 'arg0' },
			{ id: 'e8',  source: 'f-out2',sourceHandle: 'function', target: 'f-fe',  targetHandle: 'arg1' },
			{ id: 'e9',  source: 'f-fe',  target: 'out',   targetHandle: 'value' },
			// lambda 1 body: eid → normalize(subtract(enemyPos, playerPos))
			{ id: 'e10', source: 'si',    target: 'f-ep',  targetHandle: 'arg0' },
			{ id: 'e11', source: 'lam1',  sourceHandle: 'param0', target: 'f-ep',  targetHandle: 'arg1' },
			{ id: 'e12', source: 'f-ep',  target: 'f-sub', targetHandle: 'arg0' },
			{ id: 'e13', source: 'f-pp',  target: 'f-sub', targetHandle: 'arg1' },
			{ id: 'e14', source: 'f-sub', target: 'f-norm',targetHandle: 'arg0' },  // wait, it's 'v' not 'arg0'
			{ id: 'e15', source: 'f-norm',target: 'f-out1',targetHandle: 'value' },
			// lambda 2 body: dir → spawnFireball(state, playerPos, dir)
			{ id: 'e16', source: 'si',    target: 'f-fb',  targetHandle: 'arg0' },
			{ id: 'e17', source: 'f-pp',  target: 'f-fb',  targetHandle: 'arg1' },
			{ id: 'e18', source: 'lam2',  sourceHandle: 'param0', target: 'f-fb',  targetHandle: 'arg2' },
			{ id: 'e19', source: 'f-fb',  target: 'f-out2',targetHandle: 'value' },
		],
	};

export const Level25Meta: LevelMeta = {
	key: 'Level25',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'destroy-all', description: 'Destroy all 4 enemies — aim fireballs dynamically', type: 'defeat' }],
	hints: [
		'Enemy positions are RANDOMIZED each attempt — hardcoded directions will fail.',
		'map(list, f) transforms every element: map(enemies, eid → position(eid)) gives positions.',
		'subtract(enemyPos, playerPos) gives the direction vector from player to enemy.',
		'normalize(v) makes it a unit vector — safe to pass to spawnFireball.',
		'Chain: getAllEnemies → map(eid→dir) → forEach(dir→spawnFireball)',
	],
	maxSpellCasts: 3,
	initialSpellWorkflow: _answer,
	answerSpellWorkflow: _answer,
}

levelRegistry.register(Level25Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
}

export class Level25 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private levelWon: boolean = false
	private visuals!: EntityVisualManager

	constructor() { super({ key: 'Level25' }) }

	protected onLevelCreate(): void {
		if (this.visuals) this.visuals.destroyAll()
		this.visuals = new EntityVisualManager(this)

		this.enemies = []
		this.levelWon = false

		this.showInstruction(
			'【Guided Missiles — map Basics】\n\n' +
			'Four enemies appear at RANDOM positions each attempt.\n' +
			'Hardcoded directions won\'t work — you must compute them dynamically.\n\n' +
			'map transforms a list\'s element type:\n' +
			'  map(enemies, eid → ...) → a new list with the results\n\n' +
			'Chain:\n' +
			'  getAllEnemies  →  map(eid → direction)  →  forEach(dir → spawnFireball)\n\n' +
			'Direction: normalize(subtract(enemyPos, playerPos))\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Guided Missiles', [
			'Destroy all 4 enemies',
			'Enemy positions are random — compute directions dynamically',
			'map: List<eid> → List<Vector2D>',
		])

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Random positions in four quadrants (to ensure spread)
		const quadrants = [
			{ minX: 120, maxX: 360, minY: 100, maxY: 260 },
			{ minX: 600, maxX: 840, minY: 100, maxY: 260 },
			{ minX: 120, maxX: 360, minY: 380, maxY: 520 },
			{ minX: 600, maxX: 840, minY: 380, maxY: 520 },
		]
		const colors = [0xff4444, 0xff8800, 0xffcc00, 0x44cc44]

		for (let i = 0; i < 4; i++) {
			const q = quadrants[i]
			const x = Math.floor(Math.random() * (q.maxX - q.minX)) + q.minX
			const y = Math.floor(Math.random() * (q.maxY - q.minY)) + q.minY
			this.spawnEnemy(x, y, colors[i], 10)
		}
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return
		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setVelocity(0, 0)

		// Update alive enemies; destroy visuals for dead ones
		this.enemies = this.enemies.filter(ent => {
			if (!this.world.resources.bodies.has(ent.eid)) {
				this.visuals.destroy(ent.eid)
				return false
			}
			this.visuals.update(ent.eid, Health.current[ent.eid])
			return true
		})

		if (this.enemies.length === 0) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, color: number, hp: number): TrackedEnemy {
		const size = 26
		const body = createRectBody(this, `enemy25-${x}-${y}`, color, size * 2, size * 2, x, y, 5)
		body.setImmovable(true)
		body.setAlpha(0)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		this.visuals.register(eid, { role: 'enemy', x, y, radius: size, bodyColor: color, maxHP: hp })
		const tracked: TrackedEnemy = { eid, body }
		this.enemies.push(tracked)
		return tracked
	}

	private onMissionSuccess(): void {
		if (this.levelWon) return
		this.levelWon = true
		this.cameras.main.flash(400, 0, 255, 100)
		this.completeObjectiveById('destroy-all')
		this.showInstruction(
			'All enemies destroyed!\n\n' +
			'map — mastered!\n\n' +
			'map transforms the TYPE of every element in a list.\n' +
			'List<eid>  →  List<Vector2D>  →  consumed by forEach.'
		)
	}
}
