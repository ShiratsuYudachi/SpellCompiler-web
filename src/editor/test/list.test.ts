import { runner, expect } from './framework';
import { Evaluator } from '../ast/evaluator';
import { registerListFunctions } from '../library/list';
import type { Value, FunctionValue } from '../ast/ast';

runner.suite('List Library', (suite) => {
	let evaluator: Evaluator;

	suite.beforeEach(() => {
		evaluator = new Evaluator();
		registerListFunctions(evaluator);
	});

	suite.test('list::empty creates an empty list', () => {
		const empty = evaluator.callFunction('list::empty');
		
		// Empty list is a function
		expect(empty).toHaveProperty('type', 'function');
		
		// Calling it returns 0 (empty marker)
		const result = evaluator.callFunctionValue(empty as any);
		expect(result).toBe(0);
	});

	suite.test('list::isEmpty checks if list is empty', () => {
		const empty = evaluator.callFunction('list::empty');
		const nonEmpty = evaluator.callFunction('list::cons', 1, empty);
		
		expect(evaluator.callFunction('list::isEmpty', empty)).toBe(true);
		expect(evaluator.callFunction('list::isEmpty', nonEmpty)).toBe(false);
	});

	suite.test('list::cons adds element to list', () => {
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 42, empty);
		
		expect(evaluator.callFunction('list::isEmpty', list)).toBe(false);
		
		const head = evaluator.callFunction('list::head', list);
		expect(head).toBe(42);
	});

	suite.test('list::head gets first element', () => {
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 10, 
			evaluator.callFunction('list::cons', 20, empty));
		
		const head = evaluator.callFunction('list::head', list);
		expect(head).toBe(10);
	});

	suite.test('list::tail gets rest of list', () => {
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 10, 
			evaluator.callFunction('list::cons', 20, empty));
		
		const tail = evaluator.callFunction('list::tail', list);
		const head = evaluator.callFunction('list::head', tail);
		
		expect(head).toBe(20);
	});

	suite.test('list::length counts elements', () => {
		const empty = evaluator.callFunction('list::empty');
		
		expect(evaluator.callFunction('list::length', empty)).toBe(0);
		
		const list1 = evaluator.callFunction('list::cons', 1, empty);
		expect(evaluator.callFunction('list::length', list1)).toBe(1);
		
		const list2 = evaluator.callFunction('list::cons', 2, list1);
		expect(evaluator.callFunction('list::length', list2)).toBe(2);
		
		const list3 = evaluator.callFunction('list::cons', 3, list2);
		expect(evaluator.callFunction('list::length', list3)).toBe(3);
	});

	suite.test('list::map transforms elements', () => {
		// Create lambda: x => x * 2
		const double: Value = {
			type: 'function',
			definition: {
				name: '<lambda>',
				params: ['x'],
				body: { type: 'Literal', value: 0 },
				__native: (x: any) => (x as number) * 2
			}
		} as FunctionValue;
		
		// Create list [1, 2, 3]
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 1,
			evaluator.callFunction('list::cons', 2,
				evaluator.callFunction('list::cons', 3, empty)));
		
		// Map double over list
		const mapped = evaluator.callFunction('list::map', list, double);
		
		// Should be [2, 4, 6]
		expect(evaluator.callFunction('list::head', mapped)).toBe(2);
		
		const tail1 = evaluator.callFunction('list::tail', mapped);
		expect(evaluator.callFunction('list::head', tail1)).toBe(4);
		
		const tail2 = evaluator.callFunction('list::tail', tail1);
		expect(evaluator.callFunction('list::head', tail2)).toBe(6);
	});

	suite.test('list::filter removes elements', () => {
		// Create predicate: x => x > 2
		const greaterThan2: Value = {
			type: 'function',
			definition: {
				name: '<lambda>',
				params: ['x'],
				body: { type: 'Literal', value: 0 },
				__native: (x: any) => (x as number) > 2
			}
		} as FunctionValue;
		
		// Create list [1, 2, 3, 4]
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 1,
			evaluator.callFunction('list::cons', 2,
				evaluator.callFunction('list::cons', 3,
					evaluator.callFunction('list::cons', 4, empty))));
		
		// Filter
		const filtered = evaluator.callFunction('list::filter', list, greaterThan2);
		
		// Should be [3, 4]
		expect(evaluator.callFunction('list::length', filtered)).toBe(2);
		expect(evaluator.callFunction('list::head', filtered)).toBe(3);
		
		const tail = evaluator.callFunction('list::tail', filtered);
		expect(evaluator.callFunction('list::head', tail)).toBe(4);
	});

	suite.test('list::fold reduces list to single value', () => {
		// Create accumulator: (acc, x) => acc + x
		const add: Value = {
			type: 'function',
			definition: {
				name: '<lambda>',
				params: ['acc', 'x'],
				body: { type: 'Literal', value: 0 },
				__native: (acc: any, x: any) => (acc as number) + (x as number)
			}
		} as FunctionValue;
		
		// Create list [1, 2, 3, 4]
		const empty = evaluator.callFunction('list::empty');
		const list = evaluator.callFunction('list::cons', 1,
			evaluator.callFunction('list::cons', 2,
				evaluator.callFunction('list::cons', 3,
					evaluator.callFunction('list::cons', 4, empty))));
		
		// Fold with initial value 0
		const sum = evaluator.callFunction('list::fold', list, 0, add);
		
		// Should be 1 + 2 + 3 + 4 = 10
		expect(sum).toBe(10);
	});

	suite.test('list::head throws on empty list', () => {
		const empty = evaluator.callFunction('list::empty');
		
		expect(() => {
			evaluator.callFunction('list::head', empty);
		}).toThrow('Cannot get head of empty list');
	});

	suite.test('list::tail throws on empty list', () => {
		const empty = evaluator.callFunction('list::empty');
		
		expect(() => {
			evaluator.callFunction('list::tail', empty);
		}).toThrow('Cannot get tail of empty list');
	});
});
