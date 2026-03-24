/**
 * Level 6 — Treasure Hunt (Level19-style)
 *
 * Goal: getChestIndices → filter(detectTreasure) → head → openChest. Cast the spell to open the safe chest.
 * Chests are labeled 0–4. One is safe (treasure), the rest are bombs. No penalty for wrong chest.
 */

import { BaseScene } from '../base/BaseScene'
import { Health } from '../../components'
import { createRoom } from '../../utils/levelUtils'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'

// Level19-style: getChestIndices → filter(isSafe) → head → openChest(state, index). Lambda isSafe(index) = detectTreasure(state, index).
const level5InitialWorkflow = {
	nodes: [
		{ id: 'si', type: 'spellInput', position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
		{ id: 'f-gci', type: 'dynamicFunction', position: { x: 60, y: 200 }, data: { functionName: 'game::getChestIndices', displayName: 'getChestIndices', namespace: 'game', params: ['state'] } },
		{ id: 'f-filter', type: 'dynamicFunction', position: { x: 280, y: 200 }, data: { functionName: 'list::filter', displayName: 'filter', namespace: 'list', params: ['l', 'pred'] } },
		{ id: 'f-head', type: 'dynamicFunction', position: { x: 500, y: 130 }, data: { functionName: 'list::head', displayName: 'head', namespace: 'list', params: ['l'] } },
		{ id: 'f-open', type: 'dynamicFunction', position: { x: 680, y: 200 }, data: { functionName: 'game::openChest', displayName: 'openChest', namespace: 'game', params: ['state', 'chestIndex'] } },
		{ id: 'out', type: 'output', position: { x: 900, y: 200 }, data: { label: 'Output' } },
		// Lambda: isSafe(index) → detectTreasure(state, index)
		{ id: 'lam', type: 'lambdaDef', position: { x: 60, y: 420 }, data: { functionName: 'isSafe', params: ['index'] } },
		{ id: 'f-out', type: 'functionOut', position: { x: 500, y: 490 }, data: { lambdaId: 'lam' } },
		{ id: 'f-detect', type: 'dynamicFunction', position: { x: 200, y: 490 }, data: { functionName: 'game::detectTreasure', displayName: 'detectTreasure', namespace: 'game', params: ['state', 'chestIndex'] } },
	],
	edges: [
		{ id: 'e1', source: 'si', target: 'f-gci', targetHandle: 'arg0' },
		{ id: 'e2', source: 'f-gci', target: 'f-filter', targetHandle: 'arg0' },
		{ id: 'e3', source: 'f-out', sourceHandle: 'function', target: 'f-filter', targetHandle: 'arg1' },
		{ id: 'e4', source: 'f-filter', target: 'f-head', targetHandle: 'arg0' },
		{ id: 'e5', source: 'si', target: 'f-open', targetHandle: 'arg0' },
		{ id: 'e6', source: 'f-head', target: 'f-open', targetHandle: 'arg1' },
		{ id: 'e7', source: 'f-open', target: 'out', targetHandle: 'value' },
		{ id: 'e8', source: 'si', target: 'f-detect', targetHandle: 'arg0' },
		{ id: 'e9', source: 'lam', sourceHandle: 'param0', target: 'f-detect', targetHandle: 'arg1' },
		{ id: 'e10', source: 'f-detect', target: 'f-out', targetHandle: 'value' },
	],
}

export const Level5Meta: LevelMeta = {
	key: 'Level5',
	playerSpawnX: 200,
	playerSpawnY: 270,
	mapData: createRoom(15, 9),
	tileSize: 64,
	editorRestrictions: /^(game::getChestIndices|game::detectTreasure|game::openChest|list::filter|list::head)$/,
	allowedNodeTypes: ['spellInput', 'dynamicFunction', 'output', 'lambdaDef', 'functionOut'],
	objectives: [
		{
			id: 'find-treasure',
			description: 'getChestIndices → filter(detectTreasure) → head → openChest; cast to open the safe chest',
			type: 'reach',
		},
	],
	hints: [
		'getChestIndices(state) returns list [0,1,2,3,4]. Filter with a lambda: index → detectTreasure(state, index).',
		'Then head to get the first (only) safe index, then openChest(state, index). Cast the spell to open the treasure chest.',
	],
	initialSpellWorkflow: level5InitialWorkflow,
}

levelRegistry.register(Level5Meta)

interface Chest {
	sprite: Phaser.GameObjects.Image
	indexLabel: Phaser.GameObjects.Text
	isOpen: boolean
	x: number
	y: number
	item?: boolean
	opened: boolean
	index: number
}

export class Level5 extends BaseScene {
	private chests: Chest[] = []
	private readonly CHEST_OPEN_DISTANCE = 40
	private levelCompleted = false

	constructor() {
		super({ key: 'Level5' })
	}

	preload() {
		this.load.spritesheet('chest', '/assets/level6/chest.png', {
			frameWidth: 32,
			frameHeight: 32,
			startFrame: 0,
			endFrame: 1,
		})
	}

	protected onLevelCreate(): void {
		this.chests = []
		this.levelCompleted = false

		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (playerBody) {
			this.cameras.main.startFollow(playerBody, true, 0.1, 0.1)
		}

		const playerEid = this.world.resources.playerEid
		Health.max[playerEid] = 100
		Health.current[playerEid] = 100

		this.createChests()
		this.world.resources.levelData = {
			...this.world.resources.levelData,
			chests: this.chests,
			chestOpenDistance: this.CHEST_OPEN_DISTANCE,
		}

		this.showInstruction(
			'【Level 5: Treasure Hunt】\n\n' +
			'Chests are labeled 0–4. One is safe (treasure), the rest are bombs.\n' +
			'Spell: getChestIndices → filter(detectTreasure) → head → openChest. Cast the spell to open the safe chest.'
		)
		this.updateLevel5TaskInfo()
	}

	protected onLevelUpdate(): void {
		this.processOpenChestRequest()
		this.updateLevel5TaskInfo()
		this.updateChestStates()
	}

	private processOpenChestRequest(): void {
		if (this.levelCompleted) return
		const idx = this.world.resources.levelData?.['_openChestIndex']
		if (typeof idx !== 'number' || idx < 0 || idx > 4) return
		delete this.world.resources.levelData!['_openChestIndex']
		const chest = this.chests.find((c) => c.index === idx)
		if (!chest || chest.opened) return
		chest.isOpen = true
		chest.opened = true
		chest.sprite.setFrame(1)
		this.handleChestContent(chest, idx)
	}

	private createChests() {
		const worldWidth = (this as any).worldWidth || 960
		const worldHeight = (this as any).worldHeight || 540
		const chestPositions = [
			{ x: 520, y: 120 },
			{ x: 620, y: 220 },
			{ x: 720, y: 320 },
			{ x: 620, y: 420 },
			{ x: 520, y: 420 },
		]
		const treasureIndex = Math.floor(Math.random() * chestPositions.length)

		chestPositions.forEach((pos, index) => {
			const x = Math.max(50, Math.min(pos.x, worldWidth - 50))
			const y = Math.max(50, Math.min(pos.y, worldHeight - 50))
			const chestSprite = this.add.image(x, y, 'chest', 0).setOrigin(0.5, 0.5)
			const indexLabel = this.add.text(x, y - 36, String(index), {
				fontSize: '20px',
				color: '#ffffff',
				stroke: '#000000',
				strokeThickness: 3,
			}).setOrigin(0.5)
			const isTreasure = index === treasureIndex
			this.chests.push({
				sprite: chestSprite,
				indexLabel,
				isOpen: false,
				opened: false,
				x,
				y,
				item: isTreasure,
				index,
			})
		})
		if (this.world.resources.levelData) {
			this.world.resources.levelData.chests = this.chests
		}
	}

	private updateLevel5TaskInfo(): void {
		this.setTaskInfo(
			'Treasure Hunt',
			['Chests labeled 0–4. Cast spell: filter(detectTreasure) → head → openChest']
		)
	}

	private updateChestStates() {
		const playerBody = this.world.resources.bodies.get(this.world.resources.playerEid)
		if (!playerBody || this.levelCompleted) return

		const lastResult = this.world.resources.levelData?.['_lastSpellResult']
		const safeIndex = typeof lastResult === 'number' && lastResult >= 0 && lastResult <= 4 ? lastResult : null

		this.chests.forEach((chest) => {
			const distance = Phaser.Math.Distance.Between(playerBody.x, playerBody.y, chest.x, chest.y)
			if (distance >= this.CHEST_OPEN_DISTANCE && chest.isOpen && !chest.opened) {
				chest.isOpen = false
				chest.sprite.setFrame(0)
			}

			const eKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E)
			if (eKey?.isDown && distance < this.CHEST_OPEN_DISTANCE && !chest.isOpen && !chest.opened) {
				chest.isOpen = true
				chest.opened = true
				chest.sprite.setFrame(1)
				this.handleChestContent(chest, safeIndex)
			}
		})
	}

	private handleChestContent(chest: Chest, safeIndex: number | null) {
		if (chest.item === true) {
			if (safeIndex !== null && chest.index === safeIndex) {
				this.showInstruction('Correct! Treasure found. Level complete!')
				this.levelCompleted = true
				this.completeObjectiveById('find-treasure')
				this.onAllObjectivesComplete()
			} else {
				this.showInstruction('Build the spell: getChestIndices → filter(isSafe) → head → openChest. Cast it to open the safe chest.')
			}
			return
		}
		if (chest.item === false) {
			this.cameras.main.shake(120, 0.015)
			this.cameras.main.flash(100, 255, 80, 0)
			this.showInstruction('Wrong chest. Use getChestIndices → filter(detectTreasure) → head → openChest, then cast again.')
		}
	}
}
