// =============================================
// Context Menu - Blue-pink theme with hover submenus
// =============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { NodeSelectionMenu } from './NodeSelectionMenu';
import type { FunctionInfo } from '../../utils/getFunctionRegistry';
import { EditorColors, PIXEL_FONT } from '../../utils/EditorTheme'

interface ContextMenuProps {
	position: { x: number; y: number };
	onAddNode?: () => void;
	onDeleteSelected?: () => void;
	onEvaluate: () => void;
	onClose: () => void;
	// For direct node selection (used when hovering Add Node)
	onSelectFunction?: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode?: (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => void;
	editorContext?: { sceneKey?: string } | null;
	// Copy/paste support
	onCopy?: () => void;
	onPaste?: () => void;
	canPaste?: boolean;
	hasNodeSelected?: boolean;
	hasEdgeSelected?: boolean;
	// Undo/redo support
	onUndo?: () => void;
	onRedo?: () => void;
	canUndo?: boolean;
	canRedo?: boolean;
}

// Shared menu styles - Retro Pixel theme
export const menuTheme = {
	container: {
		position: 'fixed' as const,
		backgroundColor: '#1a1f2e',
		border: '2px solid #ffffff',
		borderRadius: 0,
		boxShadow: '4px 4px 0 0 rgba(0,0,0,0.5)',
		minWidth: '200px',
		maxHeight: '70vh',
		overflowY: 'auto' as const,
		zIndex: 9999,
		padding: '4px 0',
		fontFamily: PIXEL_FONT,
	},
	menuItem: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: '10px 14px',
		cursor: 'pointer',
		color: '#ffffff',
		fontSize: '8px',
		backgroundColor: 'transparent',
		border: 'none',
		width: '100%',
		textAlign: 'left' as const,
		transition: 'none',
	},
	menuItemHover: {
		backgroundColor: '#4facfe',
		color: '#ffffff',
	},
	menuItemIcon: {
		marginRight: '12px',
		width: '16px',
		textAlign: 'center' as const,
		fontSize: '12px',
	},
	menuItemArrow: {
		marginLeft: '8px',
		fontSize: '8px',
		color: 'inherit',
	},
	divider: {
		height: '2px',
		backgroundColor: 'rgba(255,255,255,0.1)',
		margin: '4px 0',
	},
	sectionLabel: {
		padding: '8px 14px',
		fontSize: '7px',
		color: '#4facfe',
		textTransform: 'uppercase' as const,
		fontWeight: 'normal',
	},
	searchContainer: {
		padding: '8px',
		borderBottom: '2px solid rgba(255,255,255,0.1)',
	},
	searchInput: {
		width: '100%',
		padding: '8px 10px',
		backgroundColor: 'rgba(0,0,0,0.3)',
		border: '1px solid rgba(255,255,255,0.2)',
		borderRadius: 0,
		color: '#ffffff',
		fontSize: '8px',
		fontFamily: PIXEL_FONT,
		outline: 'none',
	},
	searchInputFocus: {
		borderColor: '#4facfe',
	},
	deleteItem: {
		color: '#ff5c5c',
	},
	deleteItemHover: {
		backgroundColor: '#ff5c5c',
		color: '#ffffff',
	},
	disabledItem: {
		color: '#4b5563',
		cursor: 'not-allowed',
		opacity: 0.5,
	},
};

export function ContextMenu({
	position,
	onAddNode,
	onDeleteSelected,
	onEvaluate,
	onClose,
	onSelectFunction,
	onSelectBasicNode,
	editorContext,
	onCopy,
	onPaste,
	canPaste,
	hasNodeSelected,
	hasEdgeSelected,
	onUndo,
	onRedo,
	canUndo,
	canRedo,
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

	const hasSelection = hasNodeSelected || hasEdgeSelected;

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

			<div style={menuTheme.divider} />

			{/* Copy */}
			{onCopy && (
				<button
					style={{
						...menuTheme.menuItem,
						...(hasNodeSelected ? {} : menuTheme.disabledItem),
						...(hoveredItem === 'copy' && hasNodeSelected ? menuTheme.menuItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('copy')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						if (hasNodeSelected) {
							onCopy();
							onClose();
						}
					}}
					disabled={!hasNodeSelected}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>📋</span>
						Copy
					</span>
				</button>
			)}

			{/* Paste */}
			{onPaste && (
				<button
					style={{
						...menuTheme.menuItem,
						...(canPaste ? {} : menuTheme.disabledItem),
						...(hoveredItem === 'paste' && canPaste ? menuTheme.menuItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('paste')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						if (canPaste) {
							onPaste();
							onClose();
						}
					}}
					disabled={!canPaste}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>📄</span>
						Paste
					</span>
				</button>
			)}

			{/* Delete Selected */}
			{onDeleteSelected && (
				<button
					style={{
						...menuTheme.menuItem,
						...(hasSelection ? menuTheme.deleteItem : menuTheme.disabledItem),
						...(hoveredItem === 'delete' && hasSelection ? menuTheme.deleteItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('delete')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						if (hasSelection) {
							onDeleteSelected();
							onClose();
						}
					}}
					disabled={!hasSelection}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>🗑️</span>
						Delete Selected
					</span>
				</button>
			)}

			<div style={menuTheme.divider} />

			{/* Undo */}
			{onUndo && (
				<button
					style={{
						...menuTheme.menuItem,
						...(canUndo ? {} : menuTheme.disabledItem),
						...(hoveredItem === 'undo' && canUndo ? menuTheme.menuItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('undo')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						if (canUndo) {
							onUndo();
							onClose();
						}
					}}
					disabled={!canUndo}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>↩️</span>
						Undo
					</span>
				</button>
			)}

			{/* Redo */}
			{onRedo && (
				<button
					style={{
						...menuTheme.menuItem,
						...(canRedo ? {} : menuTheme.disabledItem),
						...(hoveredItem === 'redo' && canRedo ? menuTheme.menuItemHover : {}),
					}}
					onMouseEnter={() => handleItemMouseEnter('redo')}
					onMouseLeave={handleItemMouseLeave}
					onClick={() => {
						if (canRedo) {
							onRedo();
							onClose();
						}
					}}
					disabled={!canRedo}
				>
					<span>
						<span style={menuTheme.menuItemIcon}>↪️</span>
						Redo
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
