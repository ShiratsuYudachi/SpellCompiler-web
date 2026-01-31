// =============================================
// Parameter Type Inference
// Infers parameter types from parameter names to determine inline input behavior
// =============================================

/**
 * Parameter types for inline input handling
 * - number: single numeric input
 * - string: single text input
 * - Vector2D: X, Y inputs
 * - NoInline: no inline input (must connect via edge)
 */
export type ParamType = 'number' | 'string' | 'Vector2D' | 'NoInline';

/**
 * Keywords that indicate Vector2D parameters
 */
const VECTOR_KEYWORDS = ['position', 'direction', 'offset'];

/**
 * Keywords that indicate number parameters
 */
const NUMBER_KEYWORDS = ['amount', 'radius', 'delay'];

/**
 * Keywords that indicate string parameters
 */
const STRING_KEYWORDS = ['name', 'event'];

/**
 * Infer parameter type from parameter name
 * Used to determine what kind of inline input to show (if any)
 *
 * @param paramName - The parameter name to analyze
 * @returns The inferred parameter type
 */
export function inferParamType(paramName: string): ParamType {
	const lowerName = paramName.toLowerCase();

	// Vector2D - X/Y inputs
	if (VECTOR_KEYWORDS.includes(lowerName)) {
		return 'Vector2D';
	}

	// number - single numeric input
	if (NUMBER_KEYWORDS.some(kw => lowerName.includes(kw))) {
		return 'number';
	}

	// string - single text input
	if (STRING_KEYWORDS.some(kw => lowerName.includes(kw))) {
		return 'string';
	}

	// Default: no inline input (requires node connection)
	// Includes: state, entity, callback, and any unknown parameters
	return 'NoInline';
}

/**
 * Check if a parameter type should show an inline input
 *
 * @param type - The parameter type
 * @returns true if inline input should be shown
 */
export function shouldShowInlineInput(type: ParamType): boolean {
	return type !== 'NoInline';
}
