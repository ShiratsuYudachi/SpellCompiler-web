/**
 * Game World Spell Tests
 * 
 * Tests spells by executing them in real game worlds and verifying results.
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

			// Build spell AST directly: teleportRelative(initState(), getPlayer(initState()), vec::create(100, 0))
			const ast: ASTNode = {
				type: 'FunctionCall',
				function: 'game::teleportRelative',
				args: [
					// State
					{
						type: 'FunctionCall',
						function: 'game::initState',
						args: []
					},
					// Player entity
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'FunctionCall',
								function: 'game::initState',
								args: []
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

			// Cast spell
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
						type: 'FunctionCall',
						function: 'game::initState',
						args: []
					},
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'FunctionCall',
								function: 'game::initState',
								args: []
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
						type: 'FunctionCall',
						function: 'game::initState',
						args: []
					},
					{
						type: 'FunctionCall',
						function: 'game::getPlayer',
						args: [
							{
								type: 'FunctionCall',
								function: 'game::initState',
								args: []
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
})
