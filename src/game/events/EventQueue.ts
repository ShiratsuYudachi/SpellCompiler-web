/**
 * EventQueue - Event system for spell-based event handling
 * 
 * Design: Decoupled from spell execution to avoid circular dependencies.
 * Events are queued and processed by a separate game system.
 */

import type { Value } from '../../editor/ast/ast'

// Event that's been queued for processing
export interface QueuedEvent {
	name: string
	args: Value[]
	timestamp: number
}

// Event handler binding
export interface EventBinding {
	id: string
	eventName: string
	spellId: string
	// For input bindings
	triggerMode?: 'press' | 'release' | 'hold'
	holdInterval?: number  // ms, only used when triggerMode is 'hold'
	keyOrButton?: string | number  // Specific key (string) or mouse button (number) to bind to
}

// Built-in event definitions with their parameters
export const BUILT_IN_EVENTS = {
	// Per-frame events
	'onTick': { params: ['state'] },
	
	// Input events
	'onKeyPressed': { params: ['state', 'key'] },
	'onKeyReleased': { params: ['state', 'key'] },
	'whileKeyHeld': { params: ['state', 'key'] },
	'onMousePressed': { params: ['state', 'button'] },
	'onMouseReleased': { params: ['state', 'button'] },
	'whileMouseHeld': { params: ['state', 'button'] },
	
	// Game events
	'onPlayerHurt': { params: ['state', 'damage'] },
	'onEnemyKilled': { params: ['state', 'enemyEid'] },
} as const

export type BuiltInEventName = keyof typeof BUILT_IN_EVENTS

/**
 * Global event queue singleton
 * 
 * Usage:
 * - game.ts: eventQueue.emit('onBulletNear', state, bulletEid)
 * - UI: eventQueue.registerHandler('onBulletNear', spellId)
 * - eventProcessSystem: eventQueue.processQueue() → execute handlers
 */
class EventQueueManager {
	private queue: QueuedEvent[] = []
	private handlers: Map<string, Set<string>> = new Map()  // eventName → spellIds
	private bindings: Map<string, EventBinding> = new Map()  // bindingId → binding
	
	// Input state tracking for 'hold' mode
	private heldKeys: Map<string, number> = new Map()  // key → lastTriggerTime
	private heldMouseButtons: Map<number, number> = new Map()  // button → lastTriggerTime
	
	/**
	 * Emit an event to the queue
	 * Does NOT execute handlers - that's done by eventProcessSystem
	 */
	emit(name: string, ...args: Value[]): void {
		this.queue.push({
			name,
			args,
			timestamp: Date.now()
		})
	}
	
	/**
	 * Register a spell as a handler for an event
	 */
	registerHandler(eventName: string, spellId: string): void {
		if (!this.handlers.has(eventName)) {
			this.handlers.set(eventName, new Set())
		}
		this.handlers.get(eventName)!.add(spellId)
	}
	
	/**
	 * Unregister a spell handler
	 */
	unregisterHandler(eventName: string, spellId: string): void {
		this.handlers.get(eventName)?.delete(spellId)
	}
	
	/**
	 * Get all spell IDs registered for an event
	 */
	getHandlers(eventName: string): string[] {
		return Array.from(this.handlers.get(eventName) || [])
	}
	
	/**
	 * Add an event binding (for UI)
	 */
	addBinding(binding: EventBinding): void {
		this.bindings.set(binding.id, binding)
		this.registerHandler(binding.eventName, binding.spellId)
	}
	
	/**
	 * Remove an event binding
	 */
	removeBinding(bindingId: string): void {
		const binding = this.bindings.get(bindingId)
		if (binding) {
			this.unregisterHandler(binding.eventName, binding.spellId)
			this.bindings.delete(bindingId)
		}
	}
	
	/**
	 * Get all bindings
	 */
	getBindings(): EventBinding[] {
		return Array.from(this.bindings.values())
	}
	
	/**
	 * Process and clear the event queue
	 * Called by eventProcessSystem each frame
	 */
	processQueue(): QueuedEvent[] {
		const events = this.queue
		this.queue = []
		return events
	}
	
	/**
	 * Check if an event has any handlers
	 */
	hasHandlers(eventName: string): boolean {
		const handlers = this.handlers.get(eventName)
		return handlers !== undefined && handlers.size > 0
	}
	
	/**
	 * Track key held state for 'hold' mode bindings
	 */
	setKeyHeld(key: string, held: boolean): void {
		if (held) {
			if (!this.heldKeys.has(key)) {
				this.heldKeys.set(key, Date.now())
			}
		} else {
			this.heldKeys.delete(key)
		}
	}
	
	/**
	 * Track mouse button held state
	 */
	setMouseButtonHeld(button: number, held: boolean): void {
		if (held) {
			if (!this.heldMouseButtons.has(button)) {
				this.heldMouseButtons.set(button, Date.now())
			}
		} else {
			this.heldMouseButtons.delete(button)
		}
	}
	
	/**
	 * Get held keys (for hold mode processing)
	 */
	getHeldKeys(): string[] {
		return Array.from(this.heldKeys.keys())
	}
	
	/**
	 * Get held mouse buttons
	 */
	getHeldMouseButtons(): number[] {
		return Array.from(this.heldMouseButtons.keys())
	}
	
	/**
	 * Update last trigger time for hold mode
	 */
	updateHoldTriggerTime(key: string, time: number): void {
		if (this.heldKeys.has(key)) {
			this.heldKeys.set(key, time)
		}
	}
	
	/**
	 * Get last trigger time for key
	 */
	getLastTriggerTime(key: string): number {
		return this.heldKeys.get(key) || 0
	}
	
	/**
	 * Clear all state (for scene transitions)
	 */
	clear(): void {
		this.queue = []
		this.handlers.clear()
		this.bindings.clear()
		this.heldKeys.clear()
		this.heldMouseButtons.clear()
	}
}

// Global singleton
export const eventQueue = new EventQueueManager()
