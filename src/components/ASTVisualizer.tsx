// =============================================
// AST Visualizer Component
// AST 可视化组件
// =============================================

import { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import type { ASTNode } from '../ast/ast';
import { astToMermaid } from '../utils/astToMermaid';

interface ASTVisualizerProps {
	ast: ASTNode;
	className?: string;
}

// Initialize mermaid
mermaid.initialize({
	startOnLoad: true,
	theme: 'default',
	flowchart: {
		useMaxWidth: true,
		htmlLabels: true,
		curve: 'basis'
	}
});

export function ASTVisualizer({ ast, className = '' }: ASTVisualizerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mermaidCodeRef = useRef<string>('');

	useEffect(() => {
		const renderDiagram = async () => {
			if (!containerRef.current) return;

			try {
				// Convert AST to Mermaid syntax
				const mermaidCode = astToMermaid(ast);
				
				// Only re-render if code changed
				if (mermaidCode === mermaidCodeRef.current) return;
				mermaidCodeRef.current = mermaidCode;

				// Clear container
				containerRef.current.innerHTML = '';

				// Generate unique ID
				const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

				// Render diagram
				const { svg } = await mermaid.render(id, mermaidCode);
				
				if (containerRef.current) {
					containerRef.current.innerHTML = svg;
				}
			} catch (error) {
				console.error('Failed to render AST:', error);
				if (containerRef.current) {
					containerRef.current.innerHTML = `
						<div style="padding: 20px; color: red;">
							Failed to render AST visualization
						</div>
					`;
				}
			}
		};

		renderDiagram();
	}, [ast]);

	return (
		<div className={`ast-visualizer ${className}`}>
			<div 
				ref={containerRef} 
				style={{
					width: '100%',
					minHeight: '200px',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center'
				}}
			/>
		</div>
	);
}
