// =============================================
// Inline Value Helper
// Converts inline values to AST nodes
// =============================================

import type { ASTNode, Literal, FunctionCall } from '../ast/ast';
import type { InlineValue } from '../types/flowTypes';

/**
 * Convert an inline value to its corresponding AST node
 * - For Vector2D values ({x, y}): creates a vec::create function call
 * - For Literal values (number/string): creates a Literal node
 *
 * @param value - The inline value to convert
 * @returns ASTNode representing the value
 */
export function inlineValueToAST(value: InlineValue): ASTNode {
	if (typeof value === 'object' && 'x' in value && 'y' in value) {
		// Vector value: create vec::create call
		return {
			type: 'FunctionCall',
			function: 'vec::create',
			args: [
				{ type: 'Literal', value: value.x } as Literal,
				{ type: 'Literal', value: value.y } as Literal
			]
		} as FunctionCall;
	}
	// Literal value (number or string)
	return {
		type: 'Literal',
		value: value
	} as Literal;
}
