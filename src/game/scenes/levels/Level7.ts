/**
 * Level 7 — Heavy Ball (Level 6/19 style)
 *
 * Goal: getBallIndices → filter(isHeaviestBall) → head → throwBallToGate. Cast the spell to throw the heaviest ball.
 * Player cannot move. Balls labeled 0–4. No penalty; cast again if wrong ball.
 */

import { BaseScene } from '../base/BaseScene'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'

// Level 6/19 style: getBallIndices → filter(isHeaviest) → head → throwBallToGate. Lambda isHeaviest(index) = isHeaviestBall(state, index).
const level7InitialWorkflow = {
	nodes: [
		{ id: 'si', type: 'spellInput', position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
		{ id: 'f-gbi', type: 'dynamicFunction', position: { x: 60, y: 200 }, data: { functionName: 'game::getBallIndices', displayName: 'getBallIndices', namespace: 'game', params: ['state'] } },
		{ id: 'f-filter', type: 'dynamicFunction', position: { x: 280, y: 200 }, data: { functionName: 'list::filter', displayName: 'filter', namespace: 'list', params: ['l', 'pred'] } },
		{ id: 'f-head', type: 'dynamicFunction', position: { x: 500, y: 130 }, data: { functionName: 'list::head', displayName: 'head', namespace: 'list', params: ['l'] } },
		{ id: 'f-throw', type: 'dynamicFunction', position: { x: 680, y: 200 }, data: { functionName: 'game::throwBallToGate', displayName: 'throwBallToGate', namespace: 'game', params: ['state', 'ballIndex'] } },
		{ id: 'out', type: 'output', position: { x: 900, y: 200 }, data: { label: 'Output' } },
		{ id: 'lam', type: 'lambdaDef', position: { x: 60, y: 420 }, data: { functionName: 'isHeaviest', params: ['index'] } },
		{ id: 'f-out', type: 'functionOut', position: { x: 500, y: 490 }, data: { lambdaId: 'lam' } },
		{ id: 'f-isHeavy', type: 'dynamicFunction', position: { x: 200, y: 490 }, data: { functionName: 'game::isHeaviestBall', displayName: 'isHeaviestBall', namespace: 'game', params: ['state', 'ballIndex'] } },
	],
	edges: [
		{ id: 'e1', source: 'si', target: 'f-gbi', targetHandle: 'arg0' },
		{ id: 'e2', source: 'f-gbi', target: 'f-filter', targetHandle: 'arg0' },
		{ id: 'e3', source: 'f-out', sourceHandle: 'function', target: 'f-filter', targetHandle: 'arg1' },
		{ id: 'e4', source: 'f-filter', target: 'f-head', targetHandle: 'arg0' },
		{ id: 'e5', source: 'si', target: 'f-throw', targetHandle: 'arg0' },
		{ id: 'e6', source: 'f-head', target: 'f-throw', targetHandle: 'arg1' },
		{ id: 'e7', source: 'f-throw', target: 'out', targetHandle: 'value' },
		{ id: 'e8', source: 'si', target: 'f-isHeavy', targetHandle: 'arg0' },
		{ id: 'e9', source: 'lam', sourceHandle: 'param0', target: 'f-isHeavy', targetHandle: 'arg1' },
		{ id: 'e10', source: 'f-isHeavy', target: 'f-out', targetHandle: 'value' },
	],
}

export const Level7Meta: LevelMeta = {
	key: 'Level7',
	playerSpawnX: 480,
	playerSpawnY: 300,
	mapData: createRoom(15, 9),
	tileSize: 64,
	editorRestrictions: /^(game::getBallIndices|game::isHeaviestBall|game::throwBallToGate|list::filter|list::head)$/,
	allowedNodeTypes: ['spellInput', 'dynamicFunction', 'output', 'lambdaDef', 'functionOut'],
	objectives: [
		{
			id: 'heaviest-to-gate',
			description: 'getBallIndices → filter(isHeaviestBall) → head → throwBallToGate; cast to throw the heaviest ball',
			type: 'defeat',
		},
	],
	hints: [
		'getBallIndices(state) returns list [0,1,2,3,4]. Filter with lambda: index → isHeaviestBall(state, index).',
		'Then head to get the first (only) heaviest index, then throwBallToGate(state, index). Cast the spell.',
	],
	initialSpellWorkflow: level7InitialWorkflow,
}

levelRegistry.register(Level7Meta)

interface BallInfo {
	index: number
	weight: number
	marker: Phaser.GameObjects.Arc
	indexLabel: Phaser.GameObjects.Text
	x: number
	y: number
}

interface Gate {
	rect: Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	activated: boolean
}

export class Level7 extends BaseScene {
	private balls: BallInfo[] = []
	private gate!: Gate
	private heaviestWeight: number = 0
	private levelWon: boolean = false
	private levelFailed: boolean = false
	private processingThrow: boolean = false

	constructor() {
		super({ key: 'Level7' })
	}

	protected onLevelCreate(): void {
		this.balls = []
		this.levelWon = false
		this.processingThrow = false

		if (!this.world.resources.levelData) this.world.resources.levelData = {}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
			playerBody.setPosition(480, 300)
		}

		this.createBalls()
		this.heaviestWeight = Math.max(...this.balls.map((b) => b.weight))
		this.world.resources.levelData.balls = this.balls.map((b) => ({ index: b.index, weight: b.weight }))
		this.createGate()

		this.showInstruction(
			'【Level 7: Heavy Ball】\n\n' +
			'You cannot move. Build the spell: getBallIndices → filter(isHeaviestBall) → head → throwBallToGate.\n\n' +
			'• Balls are labeled 0–4. One is the heaviest. Cast the spell to throw that ball to the gate. Level completes when correct.'
		)
		this.setTaskInfo('Heavy Ball', ['getBallIndices → filter(isHeaviestBall) → head → throwBallToGate'])
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return

		// Lock player (cannot move)
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (playerBody) {
			playerBody.setVelocity(0, 0)
		}

		this.processThrowRequest()
	}

	private processThrowRequest(): void {
		if (this.levelWon || this.levelFailed || this.processingThrow) return
		const idx = this.world.resources.levelData?.['_throwBallIndex']
		if (typeof idx !== 'number' || idx < 0) return
		delete this.world.resources.levelData!['_throwBallIndex']

		const ball = this.balls.find((b) => b.index === idx)
		if (!ball) return

		this.processingThrow = true
		const gateX = this.gate.rect.x
		const gateY = this.gate.rect.y
		this.tweens.add({
			targets: ball.marker,
			x: gateX,
			y: gateY,
			duration: 600,
			ease: 'Power2',
			onComplete: () => {
				this.processingThrow = false
				if (ball.weight === this.heaviestWeight) {
					this.gate.activated = true
					this.gate.rect.setFillStyle(0x00ff00, 0.8)
					this.levelWon = true
					this.completeObjectiveById('heaviest-to-gate')
					this.showInstruction('Heaviest ball delivered! Level complete.')
					this.cameras.main.flash(300, 0, 255, 100)
				} else {
					this.cameras.main.flash(150, 255, 80, 0)
					this.cameras.main.shake(180, 0.02)
					this.showInstruction('Wrong ball. Use getBallIndices → filter(isHeaviestBall) → head → throwBallToGate, then cast again.')
					ball.marker.setPosition(ball.x, ball.y)
					ball.indexLabel = this.add.text(ball.x, ball.y - 38, String(ball.index), {
						fontSize: '18px',
						color: '#ffffff',
						stroke: '#000000',
						strokeThickness: 3,
					}).setOrigin(0.5)
				}
			},
		})
		ball.indexLabel.destroy()
	}

	private createBalls(): void {
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540
		const weights = [15, 8, 23, 5, 31]
		const positions = [
			{ x: Math.min(380, worldWidth - 50), y: Math.max(120, 50) },
			{ x: Math.min(520, worldWidth - 50), y: Math.max(180, 50) },
			{ x: Math.min(660, worldWidth - 50), y: Math.min(380, worldHeight - 50) },
			{ x: Math.max(340, 50), y: Math.min(380, worldHeight - 50) },
			{ x: Math.max(200, 50), y: Math.max(180, 50) },
		]
		positions.forEach((pos, index) => {
			const weight = weights[index]
			const x = Math.max(50, Math.min(pos.x, worldWidth - 50))
			const y = Math.max(50, Math.min(pos.y, worldHeight - 50))
			const marker = this.add.circle(x, y, 22, 0x4a90e2, 0.8).setStrokeStyle(2, 0x4a90e2)
			const indexLabel = this.add.text(x, y - 38, String(index), {
				fontSize: '18px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 3,
			}).setOrigin(0.5)
			this.balls.push({ index, weight, marker, indexLabel, x, y })
		})
	}

	private createGate(): void {
		const worldWidth = (this as any).worldWidth || 960
		const gateX = worldWidth - 100
		const gateY = 300
		this.gate = {
			rect: this.add.rectangle(gateX, gateY, 60, 120, 0x888888, 0.8).setStrokeStyle(3, 0xffffff),
			label: this.add.text(gateX, gateY - 70, 'GATE\n(Heaviest ball)', { fontSize: '14px', color: '#ffffff', stroke: '#000000', strokeThickness: 2, align: 'center' }).setOrigin(0.5),
			activated: false,
		}
	}
}
