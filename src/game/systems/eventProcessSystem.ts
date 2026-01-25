/**
 * Event Process System
 * 
 * Processes queued events each frame and executes their handler spells.
 * This system is the only place where castSpell is called for event handlers,
 * avoiding circular dependencies.
 */

import type { GameWorld } from '../gameWorld'
import { eventQueue } from '../events/EventQueue'
import { castSpell } from '../spells/castSpell'
import { getCompiledSpell } from '../../editor/utils/spellStorage'
import type { Spell } from '../../editor/ast/ast'

// Cache compiled spells to avoid reloading from storage every frame
const spellCache = new Map<string, Spell>()

/**
 * Get compiled spell from cache or storage
 */
function getSpell(spellId: string): Spell | null {
	// Check cache first
	if (spellCache.has(spellId)) {
		return spellCache.get(spellId)!
	}
	
	// Load from storage (pre-compiled)
	const compiled = getCompiledSpell(spellId)
	if (!compiled) {
		console.warn(`[EventProcess] Spell ${spellId} not found or not compiled`)
		return null
	}
	
	// Cache it
	spellCache.set(spellId, compiled)
	return compiled
}

/**
 * Clear spell cache (call when spells are updated)
 */
export function clearSpellCache(): void {
	spellCache.clear()
}

/**
 * Process all queued events
 */
export function eventProcessSystem(world: GameWorld): void {
	const playerEid = world.resources.playerEid
	if (!playerEid) return
	
	// Get all queued events
	const events = eventQueue.processQueue()
	const bindings = eventQueue.getBindings()
	
	for (const event of events) {
		// Extract key/button from event args (second element after state)
		const keyOrButton = event.args.length > 1 ? event.args[1] : undefined
		
		// Find matching bindings for this event
		for (const binding of bindings) {
			// Skip if event name doesn't match
			if (binding.eventName !== event.name) continue
			
			// For input events, check if key/button matches
			if (binding.keyOrButton !== undefined) {
				if (keyOrButton !== binding.keyOrButton) continue
			}
			
			// Skip hold mode bindings - they're processed separately
			if (binding.triggerMode === 'hold') continue
			
			const spell = getSpell(binding.spellId)
			if (!spell) continue
			
			try {
				// Event args are passed after GameState
				// GameState is always injected as first arg by castSpell
				castSpell(world, playerEid, spell, event.args.slice(1))
			} catch (err) {
				console.error(`[EventProcess] Error executing handler for ${event.name}:`, err)
			}
		}
	}
}

/**
 * Process hold events (called each frame for keys/buttons being held)
 */
export function processHoldEvents(world: GameWorld): void {
	const playerEid = world.resources.playerEid
	if (!playerEid) return
	
	const now = Date.now()
	const bindings = eventQueue.getBindings()
	
	// Process held keys
	for (const key of eventQueue.getHeldKeys()) {
		// Find bindings for this specific key with 'hold' mode
		const holdBindings = bindings.filter(
			b => b.eventName === 'whileKeyHeld' && 
			     b.triggerMode === 'hold' && 
			     b.keyOrButton === key
		)
		
		for (const binding of holdBindings) {
			const interval = binding.holdInterval || 100
			const lastTrigger = eventQueue.getLastTriggerTime(key)
			
			if (now - lastTrigger >= interval) {
				eventQueue.updateHoldTriggerTime(key, now)
				
				const spell = getSpell(binding.spellId)
				if (spell) {
					try {
						castSpell(world, playerEid, spell, [key])
					} catch (err) {
						console.error(`[EventProcess] Error in hold handler:`, err)
					}
				}
			}
		}
	}
	
	// Process held mouse buttons
	for (const button of eventQueue.getHeldMouseButtons()) {
		const holdBindings = bindings.filter(
			b => b.eventName === 'whileMouseHeld' && 
			     b.triggerMode === 'hold' &&
			     b.keyOrButton === button
		)
		
		for (const binding of holdBindings) {
			// Similar logic for mouse buttons - interval handled by eventQueue
			const spell = getSpell(binding.spellId)
			if (spell) {
				try {
					castSpell(world, playerEid, spell, [button])
				} catch (err) {
					console.error(`[EventProcess] Error in mouse hold handler:`, err)
				}
			}
		}
	}
}
