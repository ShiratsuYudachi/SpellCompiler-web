/**
 * Input Event System
 * 
 * Listens to Phaser input events and emits corresponding game events.
 * This bridges Phaser's input system with our event queue.
 */

import type Phaser from 'phaser'
import { eventQueue } from '../events/EventQueue'
import type { GameState } from '../../editor/ast/ast'

// Create a placeholder GameState for input events
// The actual GameState will be injected by castSpell
function createEventGameState(): GameState {
	return {
		type: 'gamestate',
		__runtimeRef: Symbol('EventGameState')
	}
}

/**
 * Set up input event listeners on a Phaser scene
 */
export function setupInputEventListeners(scene: Phaser.Scene): void {
	const keyboard = scene.input.keyboard
	const mouse = scene.input
	
	if (!keyboard) {
		console.warn('[InputEventSystem] No keyboard input available')
		return
	}
	
	// Keyboard events
	keyboard.on('keydown', (event: KeyboardEvent) => {
		const key = event.key
		const state = createEventGameState()
		
		// Only emit press event if key wasn't already held (prevents repeat during hold)
		if (!eventQueue.getHeldKeys().includes(key)) {
			eventQueue.emit('onKeyPressed', state, key)
		}
		
		// Track held state
		eventQueue.setKeyHeld(key, true)
	})
	
	keyboard.on('keyup', (event: KeyboardEvent) => {
		const key = event.key
		const state = createEventGameState()
		
		// Emit release event
		eventQueue.emit('onKeyReleased', state, key)
		
		// Clear held state
		eventQueue.setKeyHeld(key, false)
	})
	
	// Mouse events
	mouse.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
		const button = pointer.button
		const state = createEventGameState()
		
		// Only emit press event if button wasn't already held
		if (!eventQueue.getHeldMouseButtons().includes(button)) {
			eventQueue.emit('onMousePressed', state, button)
		}
		
		eventQueue.setMouseButtonHeld(button, true)
	})
	
	mouse.on('pointerup', (pointer: Phaser.Input.Pointer) => {
		const button = pointer.button
		const state = createEventGameState()
		
		eventQueue.emit('onMouseReleased', state, button)
		eventQueue.setMouseButtonHeld(button, false)
	})
	
	console.log('[InputEventSystem] Input event listeners set up')
}

/**
 * Emit tick event (called each frame)
 */
export function emitTickEvent(): void {
	// Only emit if there are handlers to avoid queue buildup
	if (eventQueue.hasHandlers('onTick')) {
		const state = createEventGameState()
		eventQueue.emit('onTick', state)
	}
}

/**
 * Clean up input event listeners
 */
export function cleanupInputEventListeners(scene: Phaser.Scene): void {
	const keyboard = scene.input.keyboard
	if (keyboard) {
		keyboard.removeAllListeners('keydown')
		keyboard.removeAllListeners('keyup')
	}
	
	scene.input.removeAllListeners('pointerdown')
	scene.input.removeAllListeners('pointerup')
	
	eventQueue.clear()
	console.log('[InputEventSystem] Input event listeners cleaned up')
}
