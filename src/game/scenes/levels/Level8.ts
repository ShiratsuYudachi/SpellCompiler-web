/**
 * Level 9 — Reach Goal (Level 6/19 style)
 *
 * Goal: Reach the goal. You cannot move except by spell. Three lights change; moving when NOT all same = damage.
 * Solution: if(and(eq(L1,L2), eq(L2,L3)), teleportRelative(getPlayer(), offset), 0). Cast when all 3 lights match.
 */

import { BaseScene } from '../base/BaseScene'
import { Health } from '../../components'
import { Velocity } from '../../components'
import { createRoom } from '../../utils/levelUtils'
import { LevelMeta, levelRegistry } from '../../levels/LevelRegistry'
import { flowToIR } from '../../../editor/utils/flowToIR'
import { updateSpellInCache } from '../../systems/eventProcessSystem'
import { eventQueue } from '../../events/EventQueue'
import { worldFloatingTextStyle } from '../../ui/inGameTextStyle'

const LEVEL8_SPELL_ID = '__level8_auto_spell'

// Solution only (Level 6 style): if(all lights same, teleport, 0) → Output. Player cannot move otherwise.
const level8InitialWorkflow = {
	nodes: [
		{ id: 'si', type: 'spellInput', position: { x: -200, y: 200 }, data: { label: 'Game State', params: ['state'] } },
		{
			id: 'func-teleport',
			type: 'dynamicFunction',
			position: { x: 520, y: 200 },
			data: {
				functionName: 'game::teleportRelative',
				displayName: 'teleportRelative',
				namespace: 'game',
				params: ['state', 'entity', 'offset'],
				parameterModes: {
					offset: {
						current: 'vector',
						options: [
							{ mode: 'vector', label: 'Vector', params: ['offset'] },
							{ mode: 'literal-xy', label: 'Literal (dx, dy)', params: ['dx', 'dy'] },
						],
					},
				},
			},
		},
		{ id: 'func-getPlayer', type: 'dynamicFunction', position: { x: 200, y: 120 }, data: { functionName: 'game::getPlayer', displayName: 'getPlayer', namespace: 'game', params: ['state'] } },
		{ id: 'func-vector', type: 'vector', position: { x: 200, y: 280 }, data: { x: 754, y: 0 } },
		{ id: 'out', type: 'output', position: { x: 920, y: 200 }, data: { label: 'Output' } },
		{ id: 'if-safe', type: 'if', position: { x: 740, y: 200 }, data: {} },
		{ id: 'and-lights', type: 'dynamicFunction', position: { x: 540, y: 200 }, data: { functionName: 'std::logic::and', displayName: 'and', namespace: 'std::logic', params: ['a', 'b'] } },
		{ id: 'eq-12', type: 'dynamicFunction', position: { x: 340, y: 100 }, data: { functionName: 'std::cmp::eq', displayName: 'eq', namespace: 'std::cmp', params: ['a', 'b'] } },
		{ id: 'eq-23', type: 'dynamicFunction', position: { x: 340, y: 300 }, data: { functionName: 'std::cmp::eq', displayName: 'eq', namespace: 'std::cmp', params: ['a', 'b'] } },
		{ id: 'light-1', type: 'dynamicFunction', position: { x: 80, y: 60 }, data: { functionName: 'game::getLightColor', displayName: 'getLightColor', namespace: 'game', params: ['state', 'id'] } },
		{ id: 'light-2', type: 'dynamicFunction', position: { x: 80, y: 200 }, data: { functionName: 'game::getLightColor', displayName: 'getLightColor', namespace: 'game', params: ['state', 'id'] } },
		{ id: 'light-3', type: 'dynamicFunction', position: { x: 80, y: 340 }, data: { functionName: 'game::getLightColor', displayName: 'getLightColor', namespace: 'game', params: ['state', 'id'] } },
		{ id: 'lit-1', type: 'literal', position: { x: -80, y: 60 }, data: { value: 1 } },
		{ id: 'lit-2', type: 'literal', position: { x: -80, y: 200 }, data: { value: 2 } },
		{ id: 'lit-3', type: 'literal', position: { x: -80, y: 340 }, data: { value: 3 } },
	],
	edges: [
		{ id: 'e1', source: 'si', target: 'func-teleport', targetHandle: 'arg0' },
		{ id: 'e2', source: 'si', target: 'func-getPlayer', targetHandle: 'arg0' },
		{ id: 'e3', source: 'func-getPlayer', target: 'func-teleport', targetHandle: 'arg1' },
		{ id: 'e4', source: 'func-vector', target: 'func-teleport', targetHandle: 'arg2' },
		{ id: 'e5', source: 'si', target: 'light-1', targetHandle: 'arg0' },
		{ id: 'e6', source: 'si', target: 'light-2', targetHandle: 'arg0' },
		{ id: 'e7', source: 'si', target: 'light-3', targetHandle: 'arg0' },
		{ id: 'e8', source: 'lit-1', target: 'light-1', targetHandle: 'arg1' },
		{ id: 'e9', source: 'lit-2', target: 'light-2', targetHandle: 'arg1' },
		{ id: 'e10', source: 'lit-3', target: 'light-3', targetHandle: 'arg1' },
		{ id: 'e11', source: 'light-1', target: 'eq-12', targetHandle: 'arg0' },
		{ id: 'e12', source: 'light-2', target: 'eq-12', targetHandle: 'arg1' },
		{ id: 'e13', source: 'light-2', target: 'eq-23', targetHandle: 'arg0' },
		{ id: 'e14', source: 'light-3', target: 'eq-23', targetHandle: 'arg1' },
		{ id: 'e15', source: 'eq-12', target: 'and-lights', targetHandle: 'arg0' },
		{ id: 'e16', source: 'eq-23', target: 'and-lights', targetHandle: 'arg1' },
		{ id: 'e17', source: 'and-lights', target: 'if-safe', targetHandle: 'condition' },
		{ id: 'e18', source: 'func-teleport', target: 'if-safe', targetHandle: 'then' },
		{ id: 'e19', source: 'si', target: 'if-safe', targetHandle: 'else' },
		{ id: 'e20', source: 'if-safe', target: 'out', targetHandle: 'value' },
	],
}

export const Level8Meta: LevelMeta = {
	key: 'Level8',
	playerSpawnX: 96,
	playerSpawnY: 288,
	mapData: createRoom(15, 9),
	tileSize: 64,
	editorRestrictions: /^(game::getLightColor|game::teleportRelative|game::getPlayer|std::cmp::eq|std::logic::and)$/,
	allowedNodeTypes: ['spellInput', 'dynamicFunction', 'vector', 'literal', 'if', 'output'],
	objectives: [
		{
			id: 'reach-goal',
			description: 'Reach the goal; only teleport when all 3 lights show the same color',
			type: 'reach',
		},
	],
	hints: [
		'You cannot move except by casting the spell. Lights 1, 2, 3 change color; moving when they differ = damage.',
		'Use getLightColor(state, 1), (2), (3); eq(L1,L2) and eq(L2,L3); then if(condition, teleportRelative(getPlayer(), offset), 0).',
		'Change the vector (dx, dy) and cast only when all 3 lights match to reach the green goal.',
	],
	initialSpellWorkflow: level8InitialWorkflow,
	answerSpellWorkflow: level8InitialWorkflow,
}

levelRegistry.register(Level8Meta)

const LIGHT_COLORS: Record<string, { fill: number; glow: number }> = {
	green:  { fill: 0x44ee66, glow: 0x00ff44 },
	red:    { fill: 0xff3333, glow: 0xff0000 },
	yellow: { fill: 0xffdd00, glow: 0xffbb00 },
}

interface Light {
	circle: Phaser.GameObjects.Arc       // filled circle
	glowRing: Phaser.GameObjects.Arc     // outer glow ring
	label: Phaser.GameObjects.Text       // "1" / "2" / "3"
	lastChangeTime: number
	ID: number
	color: 'green' | 'red' | 'yellow'
}

export class Level8 extends BaseScene {
	private Lights: Light[] = []
	private lightChangeInterval: number = 600
	private goalX = 850
	private goalY = 288
	private playerLastX: number = 0
	private playerLastY: number = 0
	private levelCompleted = false

	constructor() {
		super({ key: 'Level8' })
	}

	protected onLevelCreate(): void {
		this.Lights = []
		this.levelCompleted = false

		const playerEid = this.world.resources.playerEid
		Health.max[playerEid] = 100
		Health.current[playerEid] = 100

		const playerBody = this.world.resources.bodies.get(playerEid)
		if (playerBody) {
			playerBody.setPosition(96, 288)
			this.playerLastX = playerBody.x
			this.playerLastY = playerBody.y
		}

		this.createLight(520, 180)
		this.createLight(620, 280)
		this.createLight(720, 180)

		this.world.resources.levelData = { ...this.world.resources.levelData, lights: this.Lights }
		this.createGoal()

		// Auto-compile the initial spell and bind it to SPACE so the player can cast
		// without needing to manually save + bind in the editor.
		try {
			const spell = flowToIR(level8InitialWorkflow.nodes as any, level8InitialWorkflow.edges as any)
			updateSpellInCache(LEVEL8_SPELL_ID, spell)
			// Remove any leftover binding first, then add fresh
			eventQueue.removeBinding(LEVEL8_SPELL_ID)
			eventQueue.addBinding({
				id: LEVEL8_SPELL_ID,
				eventName: 'onKeyPressed',
				keyOrButton: ' ',
				spellId: LEVEL8_SPELL_ID,
				triggerMode: 'press',
			})
		} catch (e) {
			console.error('[Level8] Failed to pre-compile spell:', e)
		}

		this.showInstruction(
			'【Level 8: Reach Goal】\n\n' +
			'Press SPACE to cast the spell. You cannot move otherwise.\n\n' +
			'• Three lights cycle colors. You take damage if you move while they differ.\n' +
			'• The spell only teleports you when all 3 lights match — wait for that moment, then press SPACE.\n' +
			'• TAB = editor (you can study or modify the spell there).'
		)
		this.setTaskInfo('Reach Goal', ['Wait for all 3 lights to match, then press SPACE to cast'])
	}

	private createLight(x: number, y: number) {
		const colors: Array<'green' | 'red' | 'yellow'> = ['green', 'red', 'yellow']
		const initialColor = colors[Math.floor(Math.random() * 3)]
		const { fill, glow } = LIGHT_COLORS[initialColor]
		const id = this.Lights.length + 1

		const glowRing = this.add.circle(x, y, 26, glow, 0.25)
		const circle   = this.add.circle(x, y, 18, fill, 1).setStrokeStyle(2, 0xffffff, 0.6)
		const label = this.add
			.text(x, y + 32, String(id), worldFloatingTextStyle('14px', '#ffffff', { bold: true }))
			.setOrigin(0.5, 0)

		const light: Light = {
			circle, glowRing, label,
			lastChangeTime: this.time.now,
			ID: id,
			color: initialColor,
		}
		this.Lights.push(light)
		if (this.world.resources.levelData) this.world.resources.levelData.lights = this.Lights
	}

	private changeLightColor(light: Light) {
		if (!light.circle?.active || !this.time) return
		const colors: Array<'green' | 'red' | 'yellow'> = ['green', 'red', 'yellow']
		const color = colors[Math.floor(Math.random() * 3)]
		const { fill, glow } = LIGHT_COLORS[color]
		light.circle.setFillStyle(fill, 1)
		light.glowRing.setFillStyle(glow, 0.25)
		light.color = color
		light.lastChangeTime = this.time.now
		if (this.world.resources.levelData) this.world.resources.levelData.lights = this.Lights
	}

	private createGoal() {
		this.add.circle(this.goalX, this.goalY, 30, 0x00ff00, 0.4).setStrokeStyle(2, 0x00ff00)
	}

	private getLightColorById(id: number): 'green' | 'red' | 'yellow' | null {
		const light = this.Lights.find((l) => l.ID === id)
		return light ? light.color : null
	}

	protected onLevelUpdate(): void {
		// Movement only via spell (same as Level 1)
		const playerEid = this.world.resources.playerEid
		const playerBody = this.world.resources.bodies.get(playerEid)
		if (playerBody && !this.levelCompleted) {
			playerBody.setVelocity(0, 0)
			Velocity.x[playerEid] = 0
			Velocity.y[playerEid] = 0
		}

		if (!this.time) return
		const currentTime = this.time.now
		this.Lights = this.Lights.filter((l) => l.circle && l.circle.active)
		if (this.world.resources.levelData) this.world.resources.levelData.lights = this.Lights
		this.Lights.forEach((light) => {
			if (currentTime - light.lastChangeTime >= this.lightChangeInterval) this.changeLightColor(light)
		})

		if (!playerBody || this.levelCompleted) return
		const currentX = playerBody.x
		const currentY = playerBody.y

		// Direct position check — more reliable than physics overlap after a teleport
		if (Math.abs(currentX - this.goalX) < 50 && Math.abs(currentY - this.goalY) < 50) {
			this.levelCompleted = true
			this.onAllObjectivesComplete()
			return
		}

		const hasMoved =
			Math.abs(currentX - this.playerLastX) > 1 ||
			Math.abs(currentY - this.playerLastY) > 1 ||
			Math.abs(Velocity.x[playerEid]) > 0.1 ||
			Math.abs(Velocity.y[playerEid]) > 0.1
		if (hasMoved && this.Lights.length >= 3) {
			const c1 = this.getLightColorById(1)
			const c2 = this.getLightColorById(2)
			const c3 = this.getLightColorById(3)
			const allSame = c1 && c2 && c3 && c1 === c2 && c2 === c3
			if (!allSame) {
				const damage = 5
				const currentHealth = Health.current[playerEid] ?? 100
				Health.current[playerEid] = Math.max(0, currentHealth - damage)
				playerBody.setTint(0xff0000)
				this.time.delayedCall(100, () => { if (playerBody.active) playerBody.clearTint() })
				if (Health.current[playerEid] <= 0) {
					this.showInstruction('You died! Only move when all 3 lights match. Restarting...')
					this.time.delayedCall(1500, () => this.scene.restart())
				}
			}
		}
		this.playerLastX = currentX
		this.playerLastY = currentY
	}
}
