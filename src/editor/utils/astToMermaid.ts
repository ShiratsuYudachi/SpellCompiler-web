// =============================================
// AST to Mermaid Converter
//  AST  Mermaid 
// =============================================

import type { ASTNode, FunctionDefinition, Lambda, Sequence } from '../ast/ast';

let nodeCounter = 0;

/**
 * Convert AST to Mermaid flowchart syntax
 */
export function astToMermaid(ast: ASTNode, functions: FunctionDefinition[] = []): string {
	nodeCounter = 0;
	const lines: string[] = ['graph TD'];

	// Generate function definitions as subgraphs
	functions.forEach((func, idx) => {
		lines.push(`    subgraph func${idx}["📦 Function: ${func.name}"]`);
		lines.push(`        direction TB`);

		// Add parameters as nodes
		if (func.params.length > 0) {
			lines.push(`        params${idx}["Parameters: ${func.params.join(', ')}"]`);
			lines.push(`        style params${idx} fill:#e1e5f5`);
		}

		// Generate function body
		const funcPrefix = `f${idx}_`;
		const savedCounter = nodeCounter;
		nodeCounter = 0;
		const bodyLines: string[] = [];
		generateMermaidNode(func.body, bodyLines, funcPrefix);
		nodeCounter = savedCounter + nodeCounter;

		// Add body lines with proper indentation
		bodyLines.forEach(line => {
			lines.push(`        ${line.trim()}`);
		});

		lines.push(`    end`);
		lines.push(``);
	});

	// Generate main AST
	if (functions.length > 0) {
		lines.push(`    subgraph main["🎯 Main Expression"]`);
		lines.push(`        direction TB`);
		const mainLines: string[] = [];
		generateMermaidNode(ast, mainLines, 'main_');
		mainLines.forEach(line => {
			lines.push(`        ${line.trim()}`);
		});
		lines.push(`    end`);
	} else {
		generateMermaidNode(ast, lines);
	}

	return lines.join('\n');
}

function generateMermaidNode(node: ASTNode, lines: string[], prefix: string = ''): string {
	const nodeId = `${prefix}node${nodeCounter++}`;

	switch (node.type) {
		case 'Literal': {
			const valueStr = formatValue(node.value);
			lines.push(`${nodeId}["🔢 ${valueStr}"]`);
			lines.push(`style ${nodeId} fill:#e1f5e1`);
			break;
		}

		case 'Identifier': {
			lines.push(`${nodeId}["📌 ${node.name}"]`);
			lines.push(`style ${nodeId} fill:#e1e5f5`);
			break;
		}

		case 'FunctionCall': {
			const fnName = typeof node.function === 'string'
				? node.function
				: '(function)';
			lines.push(`${nodeId}["⚙️ ${fnName}"]`);
			lines.push(`style ${nodeId} fill:#fff4e1`);

			// Function expression (if not string)
			if (typeof node.function !== 'string') {
				const fnId = generateMermaidNode(node.function, lines, prefix);
				lines.push(`${fnId} -->|fn| ${nodeId}`);
			}

			// Arguments
			node.args.forEach((arg, index) => {
				const argId = generateMermaidNode(arg, lines, prefix);
				lines.push(`${argId} -->|arg${index}| ${nodeId}`);
			});
			break;
		}

	case 'IfExpression': {
		lines.push(`${nodeId}{"🔀 if"}`);
		lines.push(`style ${nodeId} fill:#f5e1e1`);

		const condId = generateMermaidNode(node.condition, lines, prefix);
		lines.push(`${condId} -->|condition| ${nodeId}`);

		const thenId = generateMermaidNode(node.thenBranch, lines, prefix);
		lines.push(`${thenId} -->|then| ${nodeId}`);

		const elseId = generateMermaidNode(node.elseBranch, lines, prefix);
		lines.push(`${elseId} -->|else| ${nodeId}`);
		break;
	}

	case 'Lambda': {
		const lambda = node as Lambda;
		const paramsStr = lambda.params.length > 0
			? lambda.params.join(', ')
			: 'no params';
		lines.push(`${nodeId}["λ (${paramsStr})"]`);
		lines.push(`style ${nodeId} fill:#f5e1ff`);

		// Lambda body
		const bodyId = generateMermaidNode(lambda.body, lines, prefix);
		lines.push(`${bodyId} -->|body| ${nodeId}`);
		break;
	}

	case 'Sequence': {
		const sequence = node as Sequence;
		lines.push(`${nodeId}["📜 Sequence (${sequence.expressions.length} steps)"]`);
		lines.push(`style ${nodeId} fill:#fff4e6,stroke:#fd7e14,stroke-width:2px`);

		// Each expression in the sequence
		sequence.expressions.forEach((expr, index) => {
			const exprId = generateMermaidNode(expr, lines, prefix);
			lines.push(`${exprId} -->|step${index + 1}| ${nodeId}`);
		});
		break;
	}

	default:
		lines.push(`${nodeId}["❓ Unknown: ${(node as any).type}"]`);
		lines.push(`style ${nodeId} fill:#ffcccc`);
	}

	return nodeId;
}

function formatValue(value: any): string {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return `"${value}"`;
	if (typeof value === 'number') return String(value);
	if (typeof value === 'boolean') return String(value);
	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		if (value.length <= 3) {
			return `[${value.map(v => formatValue(v)).join(', ')}]`;
		}
		return `[${value.length} items]`;
	}
	if (typeof value === 'object') {
		return '{...}';
	}
	return String(value);
}
