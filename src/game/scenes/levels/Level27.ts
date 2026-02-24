import { addComponent } from 'bitecs'
import { BaseScene } from '../base/BaseScene'
import { spawnEntity } from '../../gameWorld'
import { Health, Sprite, Enemy } from '../../components'
import { createRectBody } from '../../prefabs/createRectBody'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'
import type Phaser from 'phaser'

// ─────────────────────────────────────────────────────────────
// Level 27 — 「分类打击」
//
// 教学目标：map 专家 — filter 分组 + map 方向 + forEach 双手段
//   strong = filter(enemies, eid → hp(eid) > 60)   — 用火球
//   weak   = filter(enemies, eid → hp(eid) ≤ 60)   — 用 damageEntity
//   dirs   = map(strong, eid → normalize(subtract(pos(eid), playerPos)))
//   forEach(dirs, dir → spawnFireball(state, playerPos, dir))
//   forEach(weak,  eid → damageEntity(state, eid, 50))
//
// 机制：强敌被 damageEntity 命中 → 护盾恢复 HP（onDamage hook）
// ─────────────────────────────────────────────────────────────

export const Level27Meta: LevelMeta = {
	key: 'Level27',
	playerSpawnX: 480,
	playerSpawnY: 320,
	tileSize: 80,
	mapData: createRoom(12, 8),
	objectives: [{ id: 'clear-classified', description: 'Destroy all enemies — use fireballs for shielded, direct damage for weak', type: 'defeat' }],
	hints: [
		'Strong enemies (HP > 60, RED) have energy shields — damageEntity has no effect on them!',
		'Weak enemies (HP ≤ 60, GREY) can be hit with damageEntity but NOT fireballs (too slow).',
		'Use filter twice: once to get strong, once to get weak.',
		'map(strong, eid → direction) → forEach(dirs → spawnFireball)',
		'forEach(weak, eid → damageEntity)',
	],
	initialSpellWorkflow: {
		nodes: [
			{ id: 'si',      type: 'spellInput',     position: { x: -200, y: 300 }, data: { label: 'Game State', params: ['state'] } },
			// player position
			{ id: 'f-gp',    type: 'dynamicFunction', position: { x:   60, y:  80 }, data: { functionName: 'game::getPlayer',          displayName: 'getPlayer',         namespace: 'game', params: ['state'] } },
			{ id: 'f-pp',    type: 'dynamicFunction', position: { x:  260, y:  80 }, data: { functionName: 'game::getEntityPosition',   displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			// getAllEnemies x2
			{ id: 'f-gae1',  type: 'dynamicFunction', position: { x:   60, y: 220 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			{ id: 'f-gae2',  type: 'dynamicFunction', position: { x:   60, y: 380 }, data: { functionName: 'game::getAllEnemies', displayName: 'getAllEnemies', namespace: 'game', params: ['state'] } },
			// filter strong (hp > 60)
			{ id: 'f-fs',    type: 'dynamicFunction', position: { x:  260, y: 220 }, data: { functionName: 'list::filter', displayName: 'filter(strong)', namespace: 'list', params: ['l', 'pred'] } },
			{ id: 'lam-s',   type: 'lambdaDef',       position: { x:   60, y: 560 }, data: { functionName: 'isStrong', params: ['eid'] } },
			{ id: 'f-hps',   type: 'dynamicFunction', position: { x:  200, y: 620 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-gts',   type: 'dynamicFunction', position: { x:  370, y: 620 }, data: { functionName: 'std::cmp::gt',          displayName: '> gt',          namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-60s', type: 'literal',         position: { x:  200, y: 710 }, data: { value: 60 } },
			{ id: 'fout-s',  type: 'functionOut',     position: { x:  530, y: 620 }, data: { lambdaId: 'lam-s' } },
			// filter weak (hp <= 60)
			{ id: 'f-fw',    type: 'dynamicFunction', position: { x:  260, y: 380 }, data: { functionName: 'list::filter', displayName: 'filter(weak)', namespace: 'list', params: ['l', 'pred'] } },
			{ id: 'lam-w',   type: 'lambdaDef',       position: { x:   60, y: 820 }, data: { functionName: 'isWeak', params: ['eid'] } },
			{ id: 'f-hpw',   type: 'dynamicFunction', position: { x:  200, y: 880 }, data: { functionName: 'game::getEntityHealth', displayName: 'getEntityHealth', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-ltew',  type: 'dynamicFunction', position: { x:  370, y: 880 }, data: { functionName: 'std::cmp::lte',         displayName: '≤ lte',         namespace: 'std::cmp', params: ['a', 'b'] } },
			{ id: 'lit-60w', type: 'literal',         position: { x:  200, y: 970 }, data: { value: 60 } },
			{ id: 'fout-w',  type: 'functionOut',     position: { x:  530, y: 880 }, data: { lambdaId: 'lam-w' } },
			// map strong → directions
			{ id: 'f-map',   type: 'dynamicFunction', position: { x:  460, y: 220 }, data: { functionName: 'list::map', displayName: 'map', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-d',   type: 'lambdaDef',       position: { x:  460, y: 400 }, data: { functionName: 'toDir', params: ['eid'] } },
			{ id: 'f-ep',    type: 'dynamicFunction', position: { x:  600, y: 460 }, data: { functionName: 'game::getEntityPosition', displayName: 'getEntityPosition', namespace: 'game', params: ['state', 'eid'] } },
			{ id: 'f-sub',   type: 'dynamicFunction', position: { x:  760, y: 460 }, data: { functionName: 'vec::subtract',  displayName: 'subtract', namespace: 'vec', params: ['a', 'b'] } },
			{ id: 'f-norm',  type: 'dynamicFunction', position: { x:  920, y: 460 }, data: { functionName: 'vec::normalize', displayName: 'normalize',namespace: 'vec', params: ['v'] } },
			{ id: 'fout-d',  type: 'functionOut',     position: { x: 1080, y: 400 }, data: { lambdaId: 'lam-d' } },
			// forEach strong → spawnFireball
			{ id: 'f-fe1',   type: 'dynamicFunction', position: { x:  680, y: 220 }, data: { functionName: 'list::forEach', displayName: 'forEach(fireball)', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-fb',  type: 'lambdaDef',       position: { x:  680, y: 120 }, data: { functionName: 'shoot', params: ['dir'] } },
			{ id: 'f-fb',    type: 'dynamicFunction', position: { x:  840, y: 120 }, data: { functionName: 'game::spawnFireball', displayName: 'spawnFireball', namespace: 'game', params: ['state', 'position', 'direction'] } },
			{ id: 'fout-fb', type: 'functionOut',     position: { x: 1040, y: 120 }, data: { lambdaId: 'lam-fb' } },
			// forEach weak → damageEntity
			{ id: 'f-fe2',   type: 'dynamicFunction', position: { x:  460, y: 380 }, data: { functionName: 'list::forEach', displayName: 'forEach(damage)', namespace: 'list', params: ['l', 'f'] } },
			{ id: 'lam-de',  type: 'lambdaDef',       position: { x:  460, y: 300 }, data: { functionName: 'directHit', params: ['eid'] } },
			{ id: 'f-dmg',   type: 'dynamicFunction', position: { x:  620, y: 300 }, data: { functionName: 'game::damageEntity', displayName: 'damageEntity', namespace: 'game', params: ['state', 'eid', 'amount'] } },
			{ id: 'lit-50',  type: 'literal',         position: { x:  620, y: 380 }, data: { value: 50 } },
			{ id: 'fout-de', type: 'functionOut',     position: { x:  800, y: 300 }, data: { lambdaId: 'lam-de' } },
			{ id: 'out',     type: 'output',          position: { x: 1100, y: 220 }, data: { label: 'Output' } },
		],
		edges: [
			{ id: 'e1',  source: 'si',      target: 'f-gp',   targetHandle: 'arg0' },
			{ id: 'e2',  source: 'si',      target: 'f-pp',   targetHandle: 'arg0' },
			{ id: 'e3',  source: 'f-gp',    target: 'f-pp',   targetHandle: 'arg1' },
			{ id: 'e4',  source: 'si',      target: 'f-gae1', targetHandle: 'arg0' },
			{ id: 'e5',  source: 'si',      target: 'f-gae2', targetHandle: 'arg0' },
			// filter strong
			{ id: 'e6',  source: 'f-gae1',  target: 'f-fs',   targetHandle: 'arg0' },
			{ id: 'e7',  source: 'fout-s',  sourceHandle: 'function', target: 'f-fs', targetHandle: 'arg1' },
			{ id: 'e8',  source: 'si',      target: 'f-hps',  targetHandle: 'arg0' },
			{ id: 'e9',  source: 'lam-s',   sourceHandle: 'param0', target: 'f-hps', targetHandle: 'arg1' },
			{ id: 'e10', source: 'f-hps',   target: 'f-gts',  targetHandle: 'arg0' },
			{ id: 'e11', source: 'lit-60s', target: 'f-gts',  targetHandle: 'arg1' },
			{ id: 'e12', source: 'f-gts',   target: 'fout-s', targetHandle: 'value' },
			// filter weak
			{ id: 'e13', source: 'f-gae2',  target: 'f-fw',   targetHandle: 'arg0' },
			{ id: 'e14', source: 'fout-w',  sourceHandle: 'function', target: 'f-fw', targetHandle: 'arg1' },
			{ id: 'e15', source: 'si',      target: 'f-hpw',  targetHandle: 'arg0' },
			{ id: 'e16', source: 'lam-w',   sourceHandle: 'param0', target: 'f-hpw', targetHandle: 'arg1' },
			{ id: 'e17', source: 'f-hpw',   target: 'f-ltew', targetHandle: 'arg0' },
			{ id: 'e18', source: 'lit-60w', target: 'f-ltew', targetHandle: 'arg1' },
			{ id: 'e19', source: 'f-ltew',  target: 'fout-w', targetHandle: 'value' },
			// map strong → dirs
			{ id: 'e20', source: 'f-fs',    target: 'f-map',  targetHandle: 'arg0' },
			{ id: 'e21', source: 'fout-d',  sourceHandle: 'function', target: 'f-map', targetHandle: 'arg1' },
			{ id: 'e22', source: 'si',      target: 'f-ep',   targetHandle: 'arg0' },
			{ id: 'e23', source: 'lam-d',   sourceHandle: 'param0', target: 'f-ep',   targetHandle: 'arg1' },
			{ id: 'e24', source: 'f-ep',    target: 'f-sub',  targetHandle: 'arg0' },
			{ id: 'e25', source: 'f-pp',    target: 'f-sub',  targetHandle: 'arg1' },
			{ id: 'e26', source: 'f-sub',   target: 'f-norm', targetHandle: 'arg0' },
			{ id: 'e27', source: 'f-norm',  target: 'fout-d', targetHandle: 'value' },
			// forEach strong → spawnFireball
			{ id: 'e28', source: 'f-map',   target: 'f-fe1',  targetHandle: 'arg0' },
			{ id: 'e29', source: 'fout-fb', sourceHandle: 'function', target: 'f-fe1', targetHandle: 'arg1' },
			{ id: 'e30', source: 'si',      target: 'f-fb',   targetHandle: 'arg0' },
			{ id: 'e31', source: 'f-pp',    target: 'f-fb',   targetHandle: 'arg1' },
			{ id: 'e32', source: 'lam-fb',  sourceHandle: 'param0', target: 'f-fb',   targetHandle: 'arg2' },
			{ id: 'e33', source: 'f-fb',    target: 'fout-fb',targetHandle: 'value' },
			// forEach weak → damageEntity
			{ id: 'e34', source: 'f-fw',    target: 'f-fe2',  targetHandle: 'arg0' },
			{ id: 'e35', source: 'fout-de', sourceHandle: 'function', target: 'f-fe2', targetHandle: 'arg1' },
			{ id: 'e36', source: 'si',      target: 'f-dmg',  targetHandle: 'arg0' },
			{ id: 'e37', source: 'lam-de',  sourceHandle: 'param0', target: 'f-dmg',  targetHandle: 'arg1' },
			{ id: 'e38', source: 'lit-50',  target: 'f-dmg',  targetHandle: 'arg2' },
			{ id: 'e39', source: 'f-dmg',   target: 'fout-de',targetHandle: 'value' },
			{ id: 'e40', source: 'f-fe1',   target: 'out',    targetHandle: 'value' },
		],
	},
}

levelRegistry.register(Level27Meta)

interface TrackedEnemy {
	eid: number
	body: Phaser.Physics.Arcade.Image
	marker: Phaser.GameObjects.Arc
	label: Phaser.GameObjects.Text
	isStrong: boolean
}

export class Level27 extends BaseScene {
	private enemies: TrackedEnemy[] = []
	private shieldedEids: Set<number> = new Set()
	private levelWon: boolean = false

	constructor() { super({ key: 'Level27' }) }

	protected onLevelCreate(): void {
		this.enemies = []
		this.shieldedEids = new Set()
		this.levelWon = false

		const pb = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (pb) pb.setPosition(480, 320)

		// Random positions in quadrants
		const positions = [
			{ x: 160, y: 160 }, { x: 780, y: 180 },
			{ x: 340, y: 460 }, { x: 620, y: 460 },
			{ x: 480, y: 150 }, { x: 480, y: 480 },
		]
		const hpValues = this.shuffleArray([80, 90, 70, 30, 40, 50])

		for (let i = 0; i < 6; i++) {
			const ent = this.spawnEnemy(positions[i].x, positions[i].y, hpValues[i])
			if (ent.isStrong) this.shieldedEids.add(ent.eid)
		}

		// onDamage hook: shield restores HP for strong enemies hit by damageEntity
		this.world.resources.levelData!['onDamage'] = (eid: number, amount: number) => {
			if (!this.shieldedEids.has(eid)) return
			// Shield absorbs direct damage — restore HP
			Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + amount)
			this.cameras.main.flash(100, 100, 100, 255)
		}

		this.showInstruction(
			'【Classified Strike — map Expert】\n\n' +
			'Two types of enemies:\n' +
			'  RED (HP > 60): Energy shield — damageEntity has NO effect.\n' +
			'  GREY (HP ≤ 60): Vulnerable — only damageEntity works.\n\n' +
			'You must use TWO strategies in one spell:\n' +
			'  Strong: filter → map(eid→dir) → forEach spawnFireball\n' +
			'  Weak:   filter → forEach damageEntity\n\n' +
			'Press SPACE to cast.'
		)

		this.setTaskInfo('Classified Strike', [
			'Destroy all 6 enemies',
			'RED (shield): fireballs only',
			'GREY (no shield): direct damage only',
		])
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return
		if (this.enemies.length > 0 && this.enemies.every(e => !this.world.resources.bodies.has(e.eid))) {
			this.onMissionSuccess()
		}
	}

	private spawnEnemy(x: number, y: number, hp: number): TrackedEnemy {
		const isStrong = hp > 60
		const size = isStrong ? 30 : 24
		const color = isStrong ? 0xff3333 : 0x888888
		const marker = this.add.circle(x, y, size, color, 0.75).setStrokeStyle(isStrong ? 4 : 2, color)
		if (isStrong) {
			// Shield glow
			this.tweens.add({ targets: marker, alpha: 0.5, duration: 600, yoyo: true, repeat: -1 })
		}
		const label = this.add.text(x, y - size - 12, `HP:${hp}${isStrong ? ' 🛡' : ''}`, {
			fontSize: '12px', color: isStrong ? '#ff8888' : '#cccccc', stroke: '#000000', strokeThickness: 3,
		}).setOrigin(0.5)
		const body = createRectBody(this, `enemy27-${x}-${y}`, color, size * 2, size * 2, x, y, 5)
		body.setImmovable(true)
		const eid = spawnEntity(this.world)
		this.world.resources.bodies.set(eid, body)
		addComponent(this.world, eid, Sprite)
		addComponent(this.world, eid, Enemy)
		addComponent(this.world, eid, Health)
		Health.max[eid] = hp
		Health.current[eid] = hp
		const tracked: TrackedEnemy = { eid, body, marker, label, isStrong }
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
		this.cameras.main.flash(500, 100, 200, 255)
		this.completeObjectiveById('clear-classified')
		this.showInstruction(
			'Classified Strike — cleared!\n\n' +
			'map Expert mastered:\n' +
			'filter(strong) → map(dir) → forEach(fireball)\n' +
			'filter(weak)   → forEach(damage)\n\n' +
			'Two pipelines, one spell.'
		)
	}
}
