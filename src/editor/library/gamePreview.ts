import type { FunctionSpec } from './types'

type Vector2D = { type: 'vector2d'; x: number; y: number }

export const gamePreviewFunctions: FunctionSpec[] = [
	{
		fullName: 'game::getPlayer',
		params: {},
		returns: 'string',
		fn: () => 'player',
		ui: { displayName: 'getPlayer' },
	},
	{
		fullName: 'game::teleportRelative',
		params: { entityId: 'string', offset: 'value' },
		returns: 'value',
		fn: (_entityId: string, offset: any) => offset,
		ui: { displayName: 'teleportRelative' },
		parameterModes: {
			offset: [
				{ mode: 'literal-xy', label: 'Literal (dx, dy)', params: ['dx', 'dy'] },
				{ mode: 'vector', label: 'Vector', params: ['offset'] },
			],
		},
	},
	{
		fullName: 'game::deflectAfterTime',
		params: { angle: 'number', delayMs: 'number' },
		returns: 'boolean',
		fn: () => true,
		ui: { displayName: 'deflectAfterTime' },
	},
	{
		fullName: 'game::getProjectileAge',
		params: {},
		returns: 'number',
		fn: () => 0,
		ui: { displayName: 'getProjectileAge' },
	},
	{
		fullName: 'game::getProjectileDistance',
		params: {},
		returns: 'number',
		fn: () => 0,
		ui: { displayName: 'getProjectileDistance' },
	},
	{
		fullName: 'game::getPlayerPosition',
		params: {},
		returns: 'vector2d',
		fn: () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D),
		ui: { displayName: 'getPlayerPosition' },
	},
	{
		fullName: 'game::getCasterPosition',
		params: {},
		returns: 'vector2d',
		fn: () => ({ type: 'vector2d', x: 0, y: 0 } as Vector2D),
		ui: { displayName: 'getCasterPosition' },
	},
	{
		fullName: 'game::teleportToPosition',
		params: { entityId: 'string', position: 'vector2d' },
		returns: 'boolean',
		fn: () => true,
		ui: { displayName: 'teleportToPosition' },
		parameterModes: {
			position: [
				{ mode: 'literal-xy', label: 'Literal (x, y)', params: ['x', 'y'] },
				{ mode: 'vector', label: 'Vector', params: ['position'] },
			],
		},
	},
	{
		fullName: 'game::onTrigger',
		params: { triggerType: 'string', condition: 'value' },
		returns: 'number',
		fn: () => 1,
		ui: { displayName: 'onTrigger' },
	},
]


