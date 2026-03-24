/**
 * Level 8 — Sort & Throw (Level 6/19 style)
 *
 * Goal: getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate. Cast repeatedly to throw in order (lightest → heaviest).
 * Player cannot move. 4 balls (0–3), 4 gates. No penalty; cast again if wrong order.
 */

import { BaseScene } from '../base/BaseScene'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { createRoom } from '../../utils/levelUtils'

// Level 6/19 style: getRemainingBallIndices → filter(isLightest) → head → throwBallToGate. Lambda isLightest(index) = isLightestBall(state, index).
const level7InitialWorkflow = {
	nodes: [
		{ id: 'si', type: 'spellInput', position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
		{ id: 'f-grbi', type: 'dynamicFunction', position: { x: 60, y: 200 }, data: { functionName: 'game::getRemainingBallIndices', displayName: 'getRemainingBallIndices', namespace: 'game', params: ['state'] } },
		{ id: 'f-filter', type: 'dynamicFunction', position: { x: 280, y: 200 }, data: { functionName: 'list::filter', displayName: 'filter', namespace: 'list', params: ['l', 'pred'] } },
		{ id: 'f-head', type: 'dynamicFunction', position: { x: 500, y: 130 }, data: { functionName: 'list::head', displayName: 'head', namespace: 'list', params: ['l'] } },
		{ id: 'f-throw', type: 'dynamicFunction', position: { x: 680, y: 200 }, data: { functionName: 'game::throwBallToGate', displayName: 'throwBallToGate', namespace: 'game', params: ['state', 'ballIndex'] } },
		{ id: 'out', type: 'output', position: { x: 900, y: 200 }, data: { label: 'Output' } },
		{ id: 'lam', type: 'lambdaDef', position: { x: 60, y: 420 }, data: { functionName: 'isLightest', params: ['index'] } },
		{ id: 'f-out', type: 'functionOut', position: { x: 500, y: 490 }, data: { lambdaId: 'lam' } },
		{ id: 'f-isLight', type: 'dynamicFunction', position: { x: 200, y: 490 }, data: { functionName: 'game::isLightestBall', displayName: 'isLightestBall', namespace: 'game', params: ['state', 'ballIndex'] } },
	],
	edges: [
		{ id: 'e1', source: 'si', target: 'f-grbi', targetHandle: 'arg0' },
		{ id: 'e2', source: 'f-grbi', target: 'f-filter', targetHandle: 'arg0' },
		{ id: 'e3', source: 'f-out', sourceHandle: 'function', target: 'f-filter', targetHandle: 'arg1' },
		{ id: 'e4', source: 'f-filter', target: 'f-head', targetHandle: 'arg0' },
		{ id: 'e5', source: 'si', target: 'f-throw', targetHandle: 'arg0' },
		{ id: 'e6', source: 'f-head', target: 'f-throw', targetHandle: 'arg1' },
		{ id: 'e7', source: 'f-throw', target: 'out', targetHandle: 'value' },
		{ id: 'e8', source: 'si', target: 'f-isLight', targetHandle: 'arg0' },
		{ id: 'e9', source: 'lam', sourceHandle: 'param0', target: 'f-isLight', targetHandle: 'arg1' },
		{ id: 'e10', source: 'f-isLight', target: 'f-out', targetHandle: 'value' },
	],
}

export const Level7Meta: LevelMeta = {
	key: 'Level7',
	playerSpawnX: 480,
	playerSpawnY: 300,
	mapData: createRoom(15, 9),
	tileSize: 64,
	editorRestrictions: /^(game::getRemainingBallIndices|game::isLightestBall|game::throwBallToGate|list::filter|list::head)$/,
	allowedNodeTypes: ['spellInput', 'dynamicFunction', 'output', 'lambdaDef', 'functionOut'],
	objectives: [
		{
			id: 'complete-sort',
			description: 'getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate; cast 4 times in order',
			type: 'defeat',
		},
	],
	hints: [
		'getRemainingBallIndices(state) returns indices of balls not yet thrown. Filter with lambda: index → isLightestBall(state, index).',
		'Then head, then throwBallToGate(state, index). Cast once per throw — lightest first, then next lightest, etc.',
	],
	initialSpellWorkflow: level7InitialWorkflow,
	answerSpellWorkflow: level7InitialWorkflow,
}

levelRegistry.register(Level7Meta)

interface BallInfo {
	index: number
	weight: number
	marker: Phaser.GameObjects.Arc
	indexLabel: Phaser.GameObjects.Text
	x: number
	y: number
	thrown: boolean
}

interface Gate {
	rect: Phaser.GameObjects.Rectangle
	label: Phaser.GameObjects.Text
	activated: boolean
	order: number
}

export class Level7 extends BaseScene {
	private balls: BallInfo[] = []
	private gates: Gate[] = []
	private remainingIndices: number[] = []
	private expectedWeightsOrder: number[] = []
	private levelWon: boolean = false
	private levelFailed: boolean = false
	private processingThrow: boolean = false

	constructor() {
		super({ key: 'Level7' })
	}

	protected onLevelCreate(): void {
		this.balls = []
		this.gates = []
		this.remainingIndices = []
		this.expectedWeightsOrder = []
		this.levelWon = false
		this.processingThrow = false

		if (!this.world.resources.levelData) this.world.resources.levelData = {}

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
			playerBody.setPosition(480, 300)
		}

		this.createBalls()
		this.remainingIndices = this.balls.map((b) => b.index)
		this.expectedWeightsOrder = this.balls.map((b) => b.weight).sort((a, b) => a - b)
		this.world.resources.levelData.balls = this.balls.map((b) => ({ index: b.index, weight: b.weight }))
		this.world.resources.levelData.remainingBallIndices = [...this.remainingIndices]
		this.createGates()

		this.showInstruction(
			'【Level 7: Sort & Throw】\n\n' +
			'You cannot move. Build the spell: getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate.\n\n' +
			'• Cast once to throw the lightest remaining ball to the next gate. Cast 4 times in order (lightest → heaviest). Level completes when all 4 correct.'
		)
		this.setTaskInfo('Sort & Throw', ['getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate', 'Thrown: 0/4'])
	}

	protected onLevelUpdate(): void {
		if (this.levelWon) return

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) playerBody.setVelocity(0, 0)

		this.processThrowRequest()
	}

	private processThrowRequest(): void {
		if (this.levelWon || this.levelFailed || this.processingThrow) return
		const idx = this.world.resources.levelData?.['_throwBallIndex']
		if (typeof idx !== 'number' || idx < 0) return
		delete this.world.resources.levelData!['_throwBallIndex']

		const ball = this.balls.find((b) => b.index === idx)
		if (!ball || ball.thrown) return

		const gateIndex = 4 - this.remainingIndices.length
		if (gateIndex >= this.gates.length) return

		const gate = this.gates[gateIndex]
		const expectedWeight = this.expectedWeightsOrder[gateIndex]
		this.processingThrow = true

		this.tweens.add({
			targets: ball.marker,
			x: gate.rect.x,
			y: gate.rect.y,
			duration: 500,
			ease: 'Power2',
			onComplete: () => {
				this.processingThrow = false
				ball.indexLabel.destroy()
				ball.thrown = true

				if (ball.weight === expectedWeight) {
					gate.activated = true
					gate.rect.setFillStyle(0x00ff00, 0.7)
					this.remainingIndices = this.remainingIndices.filter((i) => i !== idx)
					this.world.resources.levelData!.remainingBallIndices = [...this.remainingIndices]
					this.cameras.main.flash(200, 0, 255, 0)
					const thrownCount = 4 - this.remainingIndices.length
					this.setTaskInfo('Sort & Throw', ['getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate', `Thrown: ${thrownCount}/4`])
					if (this.remainingIndices.length === 0) {
						this.levelWon = true
						this.completeObjectiveById('complete-sort')
						this.showInstruction('All 4 balls in order! Level complete.')
					} else {
						this.showInstruction(`Correct! Cast again to throw the next lightest (${this.remainingIndices.length} left).`)
					}
				} else {
					ball.thrown = false
					ball.marker.setPosition(ball.x, ball.y)
					ball.indexLabel = this.add.text(ball.x, ball.y - 38, String(ball.index), { fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5)
					this.remainingIndices.push(idx)
					this.remainingIndices.sort((a, b) => a - b)
					this.world.resources.levelData!.remainingBallIndices = [...this.remainingIndices]
					this.setTaskInfo('Sort & Throw', ['getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate', `Thrown: ${4 - this.remainingIndices.length}/4`])
					this.cameras.main.flash(150, 255, 80, 0)
					this.cameras.main.shake(180, 0.02)
					this.showInstruction('Wrong order. That was not the next lightest. Cast again with getRemainingBallIndices → filter(isLightestBall) → head → throwBallToGate.')
				}
			},
		})
	}

	private createBalls(): void {
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540
		const weights = [15, 8, 23, 18]
		const positions = [
			{ x: Math.min(320, worldWidth - 50), y: Math.max(140, 50) },
			{ x: Math.min(480, worldWidth - 50), y: Math.max(200, 50) },
			{ x: Math.min(400, worldWidth - 50), y: Math.min(380, worldHeight - 50) },
			{ x: Math.max(240, 50), y: Math.min(320, worldHeight - 50) },
		]
		positions.forEach((pos, index) => {
			const weight = weights[index]
			const x = Math.max(50, Math.min(pos.x, worldWidth - 50))
			const y = Math.max(50, Math.min(pos.y, worldHeight - 50))
			const marker = this.add.circle(x, y, 22, 0x4a90e2, 0.8).setStrokeStyle(2, 0x4a90e2)
			const indexLabel = this.add.text(x, y - 38, String(index), { fontSize: '18px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 }).setOrigin(0.5)
			this.balls.push({ index, weight, marker, indexLabel, x, y, thrown: false })
		})
	}

	private createGates(): void {
		const worldWidth = (this as any).worldWidth || 960
		const gateX = worldWidth - 100
		const startY = 120
		const spacing = 100
		;[1, 2, 3, 4].forEach((order, i) => {
			const gateY = startY + i * spacing
			const colors = [0x66ff66, 0xffff66, 0xffaa66, 0xff6666]
			this.gates.push({
				rect: this.add.rectangle(gateX, gateY, 80, 90, colors[i], 0.7).setStrokeStyle(3, 0xffffff),
				label: this.add.text(gateX, gateY - 55, `${order}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}`, { fontSize: '14px', color: '#000', stroke: '#fff', strokeThickness: 1, align: 'center' }).setOrigin(0.5),
				activated: false,
				order,
			})
		})
	}
}
