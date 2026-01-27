import type { Evaluator } from '../ast/evaluator';
import type { Value, FunctionValue } from '../ast/ast';

/**
 * List implemented as Church encoding (cons cells)
 * 
 * Empty list: () => null
 * Cons cell: (selector) => selector(head, tail)
 * 
 * This is a pure functional linked list implementation
 */

export function registerListFunctions(evaluator: Evaluator) {
	
	// list::empty() -> List
	evaluator.registerFunction({
		fullName: 'list::empty',
		params: [],
		fn: (): Value => {
			const emptyList: FunctionValue = {
				type: 'function',
				definition: {
					name: '<empty-list>',
					params: [],
					body: { type: 'Literal', value: 0 },
					__native: () => 0  // Return 0 as empty marker
				}
			};
			return emptyList;
		},
		ui: { displayName: '📋 empty' }
	});

	// list::cons(head: Value, tail: List) -> List
	evaluator.registerFunction({
		fullName: 'list::cons',
		params: ['head', 'tail'],
		fn: (head: Value, tail: Value): Value => {
			const consList: FunctionValue = {
				type: 'function',
				definition: {
					name: '<cons>',
					params: ['selector'],
					body: { type: 'Literal', value: 0 },
					__native: (selector: Value) => {
						if (selector === 'head') return head;
						if (selector === 'tail') return tail;
						if (selector === 'isEmpty') return false;
						throw new Error(`Invalid list selector: ${selector}`);
					}
				}
			};
			return consList;
		},
		ui: { displayName: '📋 cons' }
	});

	// list::head(l: List) -> Value
	evaluator.registerFunction({
		fullName: 'list::head',
		params: ['l'],
		fn: (l: Value): Value => {
			const funcVal = l as FunctionValue;
			// Check if it's the empty list (0 params)
			if (funcVal.definition.params.length === 0) {
				throw new Error('Cannot get head of empty list');
			}
			return evaluator.callFunctionValue(funcVal, 'head');
		},
		ui: { displayName: '📋 head' }
	});

	// list::tail(l: List) -> List
	evaluator.registerFunction({
		fullName: 'list::tail',
		params: ['l'],
		fn: (l: Value): Value => {
			const funcVal = l as FunctionValue;
			// Check if it's the empty list (0 params)
			if (funcVal.definition.params.length === 0) {
				throw new Error('Cannot get tail of empty list');
			}
			return evaluator.callFunctionValue(funcVal, 'tail');
		},
		ui: { displayName: '📋 tail' }
	});

	// list::isEmpty(l: List) -> boolean
	evaluator.registerFunction({
		fullName: 'list::isEmpty',
		params: ['l'],
		fn: (l: Value): Value => {
			const funcVal = l as FunctionValue;
			// Empty list has 0 params, cons cell has 1 param (selector)
			return funcVal.definition.params.length === 0;
		},
		ui: { displayName: '📋 isEmpty' }
	});

	// list::length(l: List) -> number
	evaluator.registerFunction({
		fullName: 'list::length',
		params: ['l'],
		fn: (l: Value): Value => {
			let count = 0;
			let current = l;
			
			while (true) {
				const funcVal = current as FunctionValue;
				// Check if empty (0 params)
				if (funcVal.definition.params.length === 0) break;
				
				count++;
				current = evaluator.callFunctionValue(funcVal, 'tail');
			}
			
			return count;
		},
		ui: { displayName: '📋 length' }
	});

	// list::map(l: List, f: Function) -> List
	evaluator.registerFunction({
		fullName: 'list::map',
		params: ['l', 'f'],
		fn: (l: Value, f: Value): Value => {
			const funcVal = l as FunctionValue;
			// Check if empty
			if (funcVal.definition.params.length === 0) {
				return evaluator.callFunction('list::empty');
			}
			
			// Apply function to head
			const head = evaluator.callFunctionValue(funcVal, 'head');
			const newHead = evaluator.callFunctionValue(f as FunctionValue, head);
			
			// Recursively map tail
			const tail = evaluator.callFunctionValue(funcVal, 'tail');
			const newTail = evaluator.callFunction('list::map', tail, f);
			
			return evaluator.callFunction('list::cons', newHead, newTail);
		},
		ui: { displayName: '📋 map' }
	});

	// list::filter(l: List, pred: Function) -> List
	evaluator.registerFunction({
		fullName: 'list::filter',
		params: ['l', 'pred'],
		fn: (l: Value, pred: Value): Value => {
			const funcVal = l as FunctionValue;
			// Check if empty
			if (funcVal.definition.params.length === 0) {
				return evaluator.callFunction('list::empty');
			}
			
			const head = evaluator.callFunctionValue(funcVal, 'head');
			const tail = evaluator.callFunctionValue(funcVal, 'tail');
			
			// Check if head passes predicate
			const passes = evaluator.callFunctionValue(pred as FunctionValue, head);
			
			// Recursively filter tail
			const filteredTail = evaluator.callFunction('list::filter', tail, pred);
			
			if (passes === true) {
				return evaluator.callFunction('list::cons', head, filteredTail);
			} else {
				return filteredTail;
			}
		},
		ui: { displayName: '📋 filter' }
	});

	// list::fold(l: List, init: Value, f: Function) -> Value
	evaluator.registerFunction({
		fullName: 'list::fold',
		params: ['l', 'init', 'f'],
		fn: (l: Value, init: Value, f: Value): Value => {
			let accumulator = init;
			let current = l;
			
			while (true) {
				const funcVal = current as FunctionValue;
				// Check if empty
				if (funcVal.definition.params.length === 0) break;
				
				const head = evaluator.callFunctionValue(funcVal, 'head');
				accumulator = evaluator.callFunctionValue(f as FunctionValue, accumulator, head);
				
				current = evaluator.callFunctionValue(funcVal, 'tail');
			}
			
			return accumulator;
		},
		ui: { displayName: '📋 fold' }
	});

	// list::forEach(l: List, f: Function) -> Value
	// Execute a function for each element in the list (for side effects)
	// Returns the last result or 0 if list is empty
	evaluator.registerFunction({
		fullName: 'list::forEach',
		params: ['l', 'f'],
		fn: (l: Value, f: Value): Value => {
			let current = l;
			let lastResult: Value = 0;
			
			while (true) {
				const funcVal = current as FunctionValue;
				// Check if empty
				if (funcVal.definition.params.length === 0) break;
				
				const head = evaluator.callFunctionValue(funcVal, 'head');
				lastResult = evaluator.callFunctionValue(f as FunctionValue, head);
				
				current = evaluator.callFunctionValue(funcVal, 'tail');
			}
			
			return lastResult;
		},
		ui: { displayName: '📋 forEach' }
	});

	// list::fromArray(arr: any) -> List (internal helper)
	// Note: This is a helper for converting JS arrays to lists (for testing/interop)
	evaluator.registerFunction({
		fullName: 'list::fromArray',
		params: ['arr'],
		fn: (arr: Value): Value => {
			// This is a hack for backwards compatibility
			// In pure functional system, we shouldn't have arrays
			if (!Array.isArray(arr)) {
				throw new Error('list::fromArray requires an array');
			}
			
			let result = evaluator.callFunction('list::empty');
			
			// Build list from right to left
			for (let i = arr.length - 1; i >= 0; i--) {
				result = evaluator.callFunction('list::cons', arr[i], result);
			}
			
			return result;
		},
		ui: { displayName: '📋 fromArray' }
	});
}
