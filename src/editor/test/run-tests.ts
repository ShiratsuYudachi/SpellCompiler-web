#!/usr/bin/env node
// =============================================
// Test Runner
//  - 
// =============================================

import { runner } from './framework';

// Import all test files
import './flowToIR.test';
import './astToMermaid.test';
import './flowToIR.tap.test';

// You can add more test files here:
// import './evaluator.test';
// import './ast.test';

// Run all tests
runner.run();

