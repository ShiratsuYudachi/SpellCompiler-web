// =============================================
// Simple Test Framework
// 
// =============================================

export interface TestCase {
	name: string;
	fn: () => void | Promise<void>;
}

export interface TestSuite {
	name: string;
	tests: TestCase[];
	beforeEach?: () => void | Promise<void>;
	afterEach?: () => void | Promise<void>;
}

export interface TestResult {
	suite: string;
	test: string;
	passed: boolean;
	error?: Error;
	duration: number;
}

export class TestRunner {
	private suites: TestSuite[] = [];
	private results: TestResult[] = [];

	suite(name: string, fn: (suite: TestSuiteBuilder) => void): void {
		const builder = new TestSuiteBuilder(name);
		fn(builder);
		this.suites.push(builder.build());
	}

	async run(): Promise<{ total: number; passed: number; failed: number }> {
		console.log('\n=== Running Tests ===\n');

		for (const suite of this.suites) {
			console.log(`\n📦 ${suite.name}`);
			console.log('─'.repeat(50));

			for (const test of suite.tests) {
				// Run beforeEach
				if (suite.beforeEach) {
					await suite.beforeEach();
				}

				const start = Date.now();
				let passed = false;
				let error: Error | undefined;

				try {
					await test.fn();
					passed = true;
					console.log(`  ✓ ${test.name}`);
				} catch (err) {
					passed = false;
					error = err as Error;
					console.log(`  ✗ ${test.name}`);
					console.log(`    ${error.message}`);
					if (error.stack) {
						const stackLines = error.stack.split('\n').slice(1, 3);
						stackLines.forEach(line => console.log(`    ${line.trim()}`));
					}
				}

				const duration = Date.now() - start;

				this.results.push({
					suite: suite.name,
					test: test.name,
					passed,
					error,
					duration
				});

				// Run afterEach
				if (suite.afterEach) {
					await suite.afterEach();
				}
			}
		}

		const total = this.results.length;
		const passed = this.results.filter(r => r.passed).length;
		const failed = total - passed;

		console.log('\n' + '='.repeat(50));
		console.log(`\n📊 Test Summary:`);
		console.log(`  Total:  ${total}`);
		console.log(`  Passed: ${passed} ✓`);
		console.log(`  Failed: ${failed} ${failed > 0 ? '✗' : ''}`);
		console.log(`  Time:   ${this.results.reduce((sum, r) => sum + r.duration, 0)}ms`);
		console.log();

		if (failed > 0) {
			console.log('❌ Some tests failed\n');
			process.exit(1);
		} else {
			console.log('✅ All tests passed\n');
		}

		return { total, passed, failed };
	}
}

export class TestSuiteBuilder {
	private tests: TestCase[] = [];
	private _beforeEach?: () => void | Promise<void>;
	private _afterEach?: () => void | Promise<void>;

	constructor(private name: string) {}

	test(name: string, fn: () => void | Promise<void>): void {
		this.tests.push({ name, fn });
	}

	beforeEach(fn: () => void | Promise<void>): void {
		this._beforeEach = fn;
	}

	afterEach(fn: () => void | Promise<void>): void {
		this._afterEach = fn;
	}

	build(): TestSuite {
		return {
			name: this.name,
			tests: this.tests,
			beforeEach: this._beforeEach,
			afterEach: this._afterEach
		};
	}
}

// =============================================
// Assertion Functions
// =============================================

export function expect<T>(actual: T): Assertion<T> {
	return new Assertion(actual);
}

class Assertion<T> {
	constructor(private actual: T) {}

	toBe(expected: T): void {
		if (this.actual !== expected) {
			throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(this.actual)}`);
		}
	}

	toEqual(expected: T): void {
		const actualStr = JSON.stringify(this.actual);
		const expectedStr = JSON.stringify(expected);
		if (actualStr !== expectedStr) {
			throw new Error(`Expected ${expectedStr}, but got ${actualStr}`);
		}
	}

	toBeNull(): void {
		if (this.actual !== null) {
			throw new Error(`Expected null, but got ${JSON.stringify(this.actual)}`);
		}
	}

	toBeUndefined(): void {
		if (this.actual !== undefined) {
			throw new Error(`Expected undefined, but got ${JSON.stringify(this.actual)}`);
		}
	}

	toBeTruthy(): void {
		if (!this.actual) {
			throw new Error(`Expected truthy value, but got ${JSON.stringify(this.actual)}`);
		}
	}

	toBeFalsy(): void {
		if (this.actual) {
			throw new Error(`Expected falsy value, but got ${JSON.stringify(this.actual)}`);
		}
	}

	toContain(item: any): void {
		if (Array.isArray(this.actual)) {
			if (!this.actual.includes(item)) {
				throw new Error(`Expected array to contain ${JSON.stringify(item)}, but it didn't`);
			}
		} else if (typeof this.actual === 'string') {
			const searchStr = typeof item === 'string' ? item : String(item);
			if (!this.actual.includes(searchStr)) {
				throw new Error(`Expected string to contain "${searchStr}", but it didn't`);
			}
		} else {
			throw new Error('toContain can only be used with arrays or strings');
		}
	}

	toHaveLength(length: number): void {
		if (!Array.isArray(this.actual) && typeof this.actual !== 'string') {
			throw new Error('toHaveLength can only be used with arrays or strings');
		}
		const actualLength = (this.actual as any).length;
		if (actualLength !== length) {
			throw new Error(`Expected length ${length}, but got ${actualLength}`);
		}
	}

	toThrow(expectedMessage?: string): void {
		if (typeof this.actual !== 'function') {
			throw new Error('toThrow can only be used with functions');
		}

		let didThrow = false;
		let error: Error | undefined;

		try {
			(this.actual as any)();
		} catch (e) {
			didThrow = true;
			error = e as Error;
		}

		if (!didThrow) {
			throw new Error('Expected function to throw, but it did not');
		}

		if (expectedMessage && error && !error.message.includes(expectedMessage)) {
			throw new Error(`Expected error message to include "${expectedMessage}", but got "${error.message}"`);
		}
	}

	toMatchObject(expected: Partial<T>): void {
		if (typeof this.actual !== 'object' || this.actual === null) {
			throw new Error('toMatchObject can only be used with objects');
		}

		for (const key in expected) {
			const actualValue = (this.actual as any)[key];
			const expectedValue = expected[key];

			if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
				throw new Error(
					`Expected property "${key}" to be ${JSON.stringify(expectedValue)}, but got ${JSON.stringify(actualValue)}`
				);
			}
		}
	}

	toHaveProperty(key: string, value?: any): void {
		if (typeof this.actual !== 'object' || this.actual === null) {
			throw new Error('toHaveProperty can only be used with objects');
		}

		if (!(key in this.actual)) {
			throw new Error(`Expected object to have property "${key}"`);
		}

		if (value !== undefined) {
			const actualValue = (this.actual as any)[key];
			if (actualValue !== value) {
				throw new Error(`Expected property "${key}" to be ${JSON.stringify(value)}, but got ${JSON.stringify(actualValue)}`);
			}
		}
	}

	toBeCloseTo(expected: number, precision: number = 2): void {
		if (typeof this.actual !== 'number') {
			throw new Error('toBeCloseTo can only be used with numbers');
		}
		
		const factor = Math.pow(10, precision);
		const actualRounded = Math.round(this.actual * factor) / factor;
		const expectedRounded = Math.round(expected * factor) / factor;
		
		if (actualRounded !== expectedRounded) {
			throw new Error(`Expected ${expected} (±${1 / factor}), but got ${this.actual}`);
		}
	}
}

// Export singleton runner
export const runner = new TestRunner();

