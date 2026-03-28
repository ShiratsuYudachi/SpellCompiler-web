/**
 * Event Process System
 * 
 * Processes queued events each frame and executes their handler spells.
 * This system is the only place where castSpell is called for event handlers,
 * avoiding circular dependencies.
 */

import type Phaser from 'phaser'
import type { GameWorld } from '../gameWorld'
import { eventQueue } from '../events/EventQueue'
import { castSpell } from '../spells/castSpell'
import { getCompiledSpell } from '../../editor/utils/spellStorage'
import type { Spell } from '../../editor/ast/ast'

// Cache compiled spells to avoid reloading from storage every frame
const spellCache = new Map<string, Spell>()

/**
 * Update a spell in the cache
 */
export function updateSpellInCache(spellId: string, spell: Spell): void {
    spellCache.set(spellId, spell)
    console.log(`[EventProcess] Updated spell ${spellId} in cache`)
}

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

/** Drop one spell from the in-memory cache (e.g. when stored AST is cleared). */
export function invalidateSpellCache(spellId: string): void {
	spellCache.delete(spellId)
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

			// Spell cast limit check
			const levelData = world.resources.levelData
			const maxCasts = levelData?.['_maxSpellCasts'] as number | undefined
			if (maxCasts !== undefined) {
				const usedCasts = (levelData!['_spellCastCount'] as number) ?? 0
				if (usedCasts >= maxCasts) {
					console.warn(`[EventProcess] Spell cast limit reached (${usedCasts}/${maxCasts}), cast rejected`)
					const scene = world.resources.scene as Phaser.Scene
					scene.events.emit('spell-cast-limit-reached', maxCasts)
					continue
				}
				// Increment before cast to prevent recursive triggers
				levelData!['_spellCastCount'] = usedCasts + 1
			}
			// ────────────────────────────────────────────────────

			try {
				// Event args are passed after GameState
				// GameState is always injected as first arg by castSpell
				const result = castSpell(world, playerEid, spell, event.args.slice(1))
				// Store last spell result for levels that need it (e.g. Level 6 treasure index)
				if (world.resources.levelData) {
					world.resources.levelData._lastSpellResult = result
				}
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
