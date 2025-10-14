#!/usr/bin/env node
// =============================================
// Test Runner
// 测试运行器 - 运行所有测试
// =============================================

import { runner } from './framework';

// Import all test files
import './flowToIR.test';

// You can add more test files here:
// import './evaluator.test';
// import './ast.test';

// Run all tests
runner.run();

