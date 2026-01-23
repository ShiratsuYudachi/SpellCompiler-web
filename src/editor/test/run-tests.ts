#!/usr/bin/env node
// =============================================
// Test Runner
// =============================================

import { runner } from './framework';

// Import all test files
import './flowToIR.test';
import './astToMermaid.test';
import './flowToIR.tap.test';
import './vector.test';
import './list.test';

// Run all tests
runner.run();

