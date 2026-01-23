import { runner, expect } from './framework';
import { Evaluator } from '../ast/evaluator';
import { registerVectorFunctions } from '../library/vector';

runner.suite('Vector Library', (suite) => {
	let evaluator: Evaluator;

	suite.beforeEach(() => {
		evaluator = new Evaluator();
		registerVectorFunctions(evaluator);
	});

	suite.test('vec::create creates a vector', () => {
		const vec = evaluator.callFunction('vec::create', 3, 4);
		
		// Vector is a function
		expect(vec).toHaveProperty('type', 'function');
		
		// Can access x and y
		const x = evaluator.callFunctionValue(vec as any, 'x');
		const y = evaluator.callFunctionValue(vec as any, 'y');
		
		expect(x).toBe(3);
		expect(y).toBe(4);
	});

	suite.test('vec::x and vec::y extract coordinates', () => {
		const vec = evaluator.callFunction('vec::create', 5, 7);
		
		const x = evaluator.callFunction('vec::x', vec);
		const y = evaluator.callFunction('vec::y', vec);
		
		expect(x).toBe(5);
		expect(y).toBe(7);
	});

	suite.test('vec::add adds two vectors', () => {
		const v1 = evaluator.callFunction('vec::create', 1, 2);
		const v2 = evaluator.callFunction('vec::create', 3, 4);
		
		const result = evaluator.callFunction('vec::add', v1, v2);
		
		const x = evaluator.callFunction('vec::x', result);
		const y = evaluator.callFunction('vec::y', result);
		
		expect(x).toBe(4);
		expect(y).toBe(6);
	});

	suite.test('vec::subtract subtracts two vectors', () => {
		const v1 = evaluator.callFunction('vec::create', 5, 8);
		const v2 = evaluator.callFunction('vec::create', 2, 3);
		
		const result = evaluator.callFunction('vec::subtract', v1, v2);
		
		const x = evaluator.callFunction('vec::x', result);
		const y = evaluator.callFunction('vec::y', result);
		
		expect(x).toBe(3);
		expect(y).toBe(5);
	});

	suite.test('vec::scale scales a vector', () => {
		const v = evaluator.callFunction('vec::create', 2, 3);
		
		const result = evaluator.callFunction('vec::scale', v, 3);
		
		const x = evaluator.callFunction('vec::x', result);
		const y = evaluator.callFunction('vec::y', result);
		
		expect(x).toBe(6);
		expect(y).toBe(9);
	});

	suite.test('vec::dot computes dot product', () => {
		const v1 = evaluator.callFunction('vec::create', 2, 3);
		const v2 = evaluator.callFunction('vec::create', 4, 5);
		
		const result = evaluator.callFunction('vec::dot', v1, v2);
		
		// 2*4 + 3*5 = 8 + 15 = 23
		expect(result).toBe(23);
	});

	suite.test('vec::length computes vector length', () => {
		const v = evaluator.callFunction('vec::create', 3, 4);
		
		const length = evaluator.callFunction('vec::length', v);
		
		// sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
		expect(length).toBe(5);
	});

	suite.test('vec::normalize normalizes a vector', () => {
		const v = evaluator.callFunction('vec::create', 3, 4);
		
		const normalized = evaluator.callFunction('vec::normalize', v);
		
		const x = evaluator.callFunction('vec::x', normalized) as number;
		const y = evaluator.callFunction('vec::y', normalized) as number;
		
		expect(x).toBeCloseTo(0.6);
		expect(y).toBeCloseTo(0.8);
		
		// Length should be 1
		const length = evaluator.callFunction('vec::length', normalized) as number;
		expect(length).toBeCloseTo(1);
	});

	suite.test('vec::distance computes distance between vectors', () => {
		const v1 = evaluator.callFunction('vec::create', 1, 2);
		const v2 = evaluator.callFunction('vec::create', 4, 6);
		
		const distance = evaluator.callFunction('vec::distance', v1, v2);
		
		// sqrt((4-1)^2 + (6-2)^2) = sqrt(9 + 16) = sqrt(25) = 5
		expect(distance).toBe(5);
	});

	suite.test('vec::normalize handles zero vector', () => {
		const v = evaluator.callFunction('vec::create', 0, 0);
		
		const normalized = evaluator.callFunction('vec::normalize', v);
		
		const x = evaluator.callFunction('vec::x', normalized);
		const y = evaluator.callFunction('vec::y', normalized);
		
		expect(x).toBe(0);
		expect(y).toBe(0);
	});
});
