// =============================================
// Context Menu - Blue-pink theme with hover submenus
// =============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { NodeSelectionMenu } from './NodeSelectionMenu';
import type { FunctionInfo } from '../../utils/getFunctionRegistry';

interface ContextMenuProps {
	position: { x: number; y: number };
	onAddNode?: () => void;
	onDeleteSelected?: () => void;
	onEvaluate: () => void;
	onClose: () => void;
	hasSelection?: boolean;
	// For direct node selection (used when hovering Add Node)
	onSelectFunction?: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode?: (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => void;
	editorContext?: { sceneKey?: string } | null;
}

// Shared menu styles - Blue-pink theme
export const menuTheme = {
	container: {
		position: 'fixed' as const,
		backgroundColor: '#ffffff',
		border: '1px solid #e8d5e0',
		borderRadius: '8px',
		boxShadow: '0 4px 20px rgba(255, 143, 171, 0.15), 0 2px 8px rgba(110, 181, 255, 0.1)',
		minWidth: '180px',
		maxHeight: '70vh',
		overflowY: 'auto' as const,
		zIndex: 9999,
		padding: '4px 0',
	},
	menuItem: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '8px 14px',
		cursor: 'pointer',
		color: '#374151',
		fontSize: '13px',
		fontWeight: 500,
		backgroundColor: 'transparent',
		border: 'none',
		width: '100%',
		textAlign: 'left' as const,
		transition: 'all 0.15s ease',
	},
	menuItemHover: {
		backgroundColor: '#f0f7ff',
		color: '#1e40af',
	},
	menuItemIcon: {
		marginRight: '10px',
		width: '20px',
		textAlign: 'center' as const,
		fontSize: '14px',
	},
	menuItemArrow: {
		marginLeft: '8px',
		opacity: 0.5,
		fontSize: '10px',
		color: '#6b7280',
	},
	divider: {
		height: '1px',
		backgroundColor: '#f3e8ed',
		margin: '4px 8px',
	},
	sectionLabel: {
		padding: '6px 14px',
		fontSize: '11px',
		color: '#9ca3af',
		textTransform: 'uppercase' as const,
		letterSpacing: '0.5px',
		fontWeight: 600,
	},
	searchContainer: {
		padding: '8px',
		borderBottom: '1px solid #f3e8ed',
	},
	searchInput: {
		width: '100%',
		padding: '8px 12px',
		backgroundColor: '#faf5f7',
		border: '1px solid #e8d5e0',
		borderRadius: '6px',
		color: '#374151',
		fontSize: '13px',
		outline: 'none',
		transition: 'border-color 0.15s, box-shadow 0.15s',
	},
	searchInputFocus: {
		borderColor: '#93c5fd',
		boxShadow: '0 0 0 3px rgba(147, 197, 253, 0.2)',
	},
	deleteItem: {
		color: '#dc2626',
	},
	deleteItemHover: {
		backgroundColor: '#fef2f2',
		color: '#b91c1c',
	},
};

export function ContextMenu({
	position,
	onAddNode,
	onDeleteSelected,
	onEvaluate,
	onClose,
	hasSelection,
	onSelectFunction,
	onSelectBasicNode,
	editorContext
}: ContextMenuProps) {
	const [showAddNodeMenu, setShowAddNodeMenu] = useState(false);
	const [subMenuPosition, setSubMenuPosition] = useState<{ x: number; y: number } | null>(null);
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<number | null>(null);

	// Handle click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [onClose]);

	// Handle escape key
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const handleAddNodeMouseEnter = useCallback((event: React.MouseEvent) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		setHoveredItem('addNode');
		setShowAddNodeMenu(true);
		setSubMenuPosition({ x: rect.right - 4, y: rect.top });
	}, []);

	const handleAddNodeMouseLeave = useCallback(() => {
		hoverTimeoutRef.current = window.setTimeout(() => {
			setShowAddNodeMenu(false);
			setSubMenuPosition(null);
			setHoveredItem(null);
		}, 150);
	}, []);

	const handleSubMenuMouseEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
	}, []);

	const handleItemMouseEnter = useCallback((item: string) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
		// Close add node submenu when hovering other items
		if (item !== 'addNode') {
			setShowAddNodeMenu(false);
			setSubMenuPosition(null);
		}
		setHoveredItem(item);
	}, []);

	const handleItemMouseLeave = useCallback(() => {
		setHoveredItem(null);
	}, []);

	// Adjust menu position to stay within viewport
	const adjustedPosition = { ...position };
	if (menuRef.current) {
		const rect = menuRef.current.getBoundingClientRect();
		if (position.x + rect.width > window.innerWidth) {
			adjustedPosition.x = window.innerWidth - rect.width - 10;
		}
		if (position.y + rect.height > window.innerHeight) {
			adjustedPosition.y = Math.max(10, window.innerHeight - rect.height - 10);
		}
	}

	const handleSelectFunction = (funcInfo: FunctionInfo) => {
		if (onSelectFunction) {
			onSelectFunction(funcInfo);
		}
		onClose();
	};

	const handleSelectBasicNode = (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => {
		if (onSelectBasicNode) {
			onSelectBasicNode(type);
		}
		onClose();
	};

	return (
		<div
			ref={menuRef}
			style={{
				...menuTheme.container,
				left: `${adjustedPosition.x}px`,
				top: `${adjustedPosition.y}px`,
			}}
		>
			{/* Add Node - with submenu on hover */}
			<div
				onMouseEnter={handleAddNodeMouseEnter}
				onMouseLeave={handleAddNodeMouseLeave}
			>
				<button
					style={{
						...menuTheme.menuItem,
						...(hoveredItem === 'addNode' ? menuTheme.menuItemHover : {}),
					}}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>➕</span>
						Add Node
					</span>
					<span style={menuTheme.menuItemArrow}>▶</span>
				</button>

				{showAddNodeMenu && subMenuPosition && onSelectFunction && onSelectBasicNode && (
					<div
						onMouseEnter={handleSubMenuMouseEnter}
						onMouseLeave={handleAddNodeMouseLeave}
					>
						<NodeSelectionMenu
							position={subMenuPosition}
							onSelectFunction={handleSelectFunction}
							onSelectBasicNode={handleSelectBasicNode}
							onClose={onClose}
							editorContext={editorContext}
						/>
					</div>
				)}
			</div>

			{/* Delete Selected */}
			{hasSelection && onDeleteSelected && (
				<button
					style={{
						...menuTheme.menuItem,
						...menuTheme.deleteItem,
						...(hoveredItem === 'delete' ? menuTheme.deleteItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('delete')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						onDeleteSelected();
						onClose();
					}}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>🗑️</span>
						Delete Selected
					</span>
				</button>
			)}

			<div style={menuTheme.divider} />

			{/* Evaluate */}
			<button
				style={{
					...menuTheme.menuItem,
					...(hoveredItem === 'evaluate' ? menuTheme.menuItemHover : {}),
				}}
				onMouseEnter={() => handleItemMouseEnter('evaluate')}
				onMouseLeave={handleItemMouseLeave}
				onClick={() => {
					onEvaluate();
					onClose();
				}}
			>
				<span>
					<span style={menuTheme.menuItemIcon}>▶️</span>
					Evaluate
				</span>
			</button>
		</div>
	);
}
