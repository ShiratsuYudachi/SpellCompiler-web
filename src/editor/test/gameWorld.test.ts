/**
 * Game World Spell Tests
 * 
 * Tests spells by executing them in real game worlds and verifying results.
 * Uses SpellInput nodes to inject GameState at runtime.
 */

import { runner, expect } from './framework'
import { createTestWorld } from './gameWorldTestFramework'
import type { CompiledSpell } from '../../game/spells/types'
import type { ASTNode } from '../ast/ast'

runner.suite('Game World - Teleport Spell', (suite) => {
	suite.test('teleportRelative moves player 100 pixels right', () => {
		// Create test world with player at (100, 100)
		const testWorld = createTestWorld({ playerX: 100, playerY: 100 })

		try {
			// Get initial position
			const initialPos = testWorld.getPlayerPosition()
			expect(initialPos.x).toBe(100)
			expect(initialPos.y).toBe(100)

			// Build spell AST: teleportRelative(state, getPlayer(state), vec::create(100, 0))
			// Note: 'state' is an Identifier that will be resolved from injected environment
			const ast: ASTNode = {
				type: 'FunctionCall',
				function: 'game::teleportRelative',
				args: [
					// State - comes from environment
					{
						type: 'Identifier',
						name: 'state'
					},
					// Player entity
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'Identifier',
								name: 'state'
							}
						]
					},
					// Offset vector (100, 0)
					{
						type: 'FunctionCall',
						function: 'vec::create',
						args: [
							{ type: 'Literal', value: 100 },
							{ type: 'Literal', value: 0 }
						]
					}
				]
			}

			const spell: CompiledSpell = {
				ast,
				dependencies: []
			}

			// Cast spell (GameState will be injected by castSpell)
			testWorld.castSpell(spell)

			// Verify position changed
			const finalPos = testWorld.getPlayerPosition()
			expect(finalPos.x).toBe(200) // 100 + 100
			expect(finalPos.y).toBe(100) // unchanged
		} finally {
			testWorld.destroy()
		}
	})

	suite.test('teleportRelative can move player in Y direction', () => {
		const testWorld = createTestWorld({ playerX: 150, playerY: 150 })

		try {
			const initialPos = testWorld.getPlayerPosition()
			expect(initialPos.x).toBe(150)
			expect(initialPos.y).toBe(150)

			// Spell: teleport(state, player, vec(0, 50))
			const ast: ASTNode = {
				type: 'FunctionCall',
				function: 'game::teleportRelative',
				args: [
					{
						type: 'Identifier',
						name: 'state'
					},
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'Identifier',
								name: 'state'
							}
						]
					},
					{
						type: 'FunctionCall',
						function: 'vec::create',
						args: [
							{ type: 'Literal', value: 0 },
							{ type: 'Literal', value: 50 }
						]
					}
				]
			}

			const spell: CompiledSpell = { ast, dependencies: [] }
			testWorld.castSpell(spell)

			const finalPos = testWorld.getPlayerPosition()
			expect(finalPos.x).toBe(150) // unchanged
			expect(finalPos.y).toBe(200) // 150 + 50
		} finally {
			testWorld.destroy()
		}
	})

	suite.test('teleportRelative with negative offsets', () => {
		const testWorld = createTestWorld({ playerX: 200, playerY: 200 })

		try {
			// Teleport -50 in X, -30 in Y
			const ast: ASTNode = {
				type: 'FunctionCall',
				function: 'game::teleportRelative',
				args: [
					{
						type: 'Identifier',
						name: 'state'
					},
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'Identifier',
								name: 'state'
							}
						]
					},
					{
						type: 'FunctionCall',
						function: 'vec::create',
						args: [
							{ type: 'Literal', value: -50 },
							{ type: 'Literal', value: -30 }
						]
					}
				]
			}

			const spell: CompiledSpell = { ast, dependencies: [] }
			testWorld.castSpell(spell)

			const finalPos = testWorld.getPlayerPosition()
			expect(finalPos.x).toBe(150) // 200 - 50
			expect(finalPos.y).toBe(170) // 200 - 30
		} finally {
			testWorld.destroy()
		}
	})

	suite.test('state can be reused for multiple query operations', () => {
		const testWorld = createTestWorld({ playerX: 120, playerY: 140 })

		try {
			// This spell demonstrates that the same state identifier can be used
			// multiple times for query operations (getPlayer, getEntityPosition)
			
			// For now, just test that we can get player position
			const ast: ASTNode = {
				type: 'FunctionCall',
				function: 'game::getEntityPosition',
				args: [
					{
						type: 'Identifier',
						name: 'state'
					},
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'Identifier',
								name: 'state'
							}
						]
					}
				]
			}

			const spell: CompiledSpell = { ast, dependencies: [] }
			const result = testWorld.castSpell(spell)

			// Result should be a Vector2D function
			expect(typeof result).toBe('object')
			expect((result as any).type).toBe('function')
		} finally {
			testWorld.destroy()
		}
	})
})
