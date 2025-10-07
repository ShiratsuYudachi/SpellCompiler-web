// =============================================
// AST to Mermaid Converter
// 将 AST 转换为 Mermaid 图表
// =============================================

import type { ASTNode } from '../ast/ast';

let nodeCounter = 0;

/**
 * Convert AST to Mermaid flowchart syntax
 */
export function astToMermaid(ast: ASTNode): string {
	nodeCounter = 0;
	const lines: string[] = ['graph TD'];
	
	generateMermaidNode(ast, lines);
	
	return lines.join('\n');
}

function generateMermaidNode(node: ASTNode, lines: string[]): string {
	const nodeId = `node${nodeCounter++}`;
	
	switch (node.type) {
		case 'Literal': {
			const valueStr = formatValue(node.value);
			lines.push(`    ${nodeId}["🔢 ${valueStr}"]`);
			lines.push(`    style ${nodeId} fill:#e1f5e1`);
			break;
		}
		
		case 'Identifier': {
			lines.push(`    ${nodeId}["📌 ${node.name}"]`);
			lines.push(`    style ${nodeId} fill:#e1e5f5`);
			break;
		}
		
		case 'FunctionCall': {
			const fnName = typeof node.function === 'string' 
				? node.function 
				: '(function)';
			lines.push(`    ${nodeId}["⚙️ ${fnName}"]`);
			lines.push(`    style ${nodeId} fill:#fff4e1`);
			
			// Function expression (if not string)
			if (typeof node.function !== 'string') {
				const fnId = generateMermaidNode(node.function, lines);
				lines.push(`    ${fnId} -->|fn| ${nodeId}`);
			}
			
			// Arguments
			node.args.forEach((arg, index) => {
				const argId = generateMermaidNode(arg, lines);
				lines.push(`    ${argId} -->|arg${index}| ${nodeId}`);
			});
			break;
		}
		
		case 'IfExpression': {
			lines.push(`    ${nodeId}{"🔀 if"}]`);
			lines.push(`    style ${nodeId} fill:#f5e1e1`);
			
			const condId = generateMermaidNode(node.condition, lines);
			lines.push(`    ${condId} -->|condition| ${nodeId}`);
			
			const thenId = generateMermaidNode(node.thenBranch, lines);
			lines.push(`    ${thenId} -->|then| ${nodeId}`);
			
			const elseId = generateMermaidNode(node.elseBranch, lines);
			lines.push(`    ${elseId} -->|else| ${nodeId}`);
			break;
		}
		
		default:
			lines.push(`    ${nodeId}["❓ Unknown"]`);
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
