// =============================================
// Node Selection Menu - Blender-style nested submenus
// Blue-pink theme (March 7th inspired)
// =============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { getFunctionTreeForMenu, type FunctionInfo, type FunctionTreeNode } from '../../utils/getFunctionRegistry';
import { levelRegistry } from '../../../game/levels/LevelRegistry';
import { menuTheme } from './ContextMenu';

// Type for function nodes only (not groups)
type FunctionNode = Extract<FunctionTreeNode, { type: 'function' }>;

interface NodeSelectionMenuProps {
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onSelectBasicNode: (type: 'literal' | 'if' | 'output' | 'lambdaDef' | 'customFunction' | 'applyFunc' | 'vector' | 'spellInput') => void;
	onClose: () => void;
	editorContext?: { sceneKey?: string } | null;
}

const BASIC_NODES = [
	{ type: 'spellInput' as const, label: 'Spell Input', icon: '🎯' },
	{ type: 'literal' as const, label: 'Literal', icon: '🔢' },
	{ type: 'vector' as const, label: 'Vector2D', icon: '📐' },
	{ type: 'if' as const, label: 'If', icon: '🔀' },
	{ type: 'customFunction' as const, label: 'Call Function', icon: '📞' },
	{ type: 'applyFunc' as const, label: 'Apply', icon: '⚡' },
	{ type: 'lambdaDef' as const, label: 'Lambda', icon: 'λ' },
	{ type: 'output' as const, label: 'Output', icon: '📤' },
];

// SubMenu component for nested menus
interface SubMenuProps {
	items: FunctionTreeNode[];
	position: { x: number; y: number };
	onSelectFunction: (funcInfo: FunctionInfo) => void;
	onClose: () => void;
	toFunctionInfo: (fullName: string, params: string[], displayName: string) => FunctionInfo;
}

function SubMenu({ items, position, onSelectFunction, onClose, toFunctionInfo }: SubMenuProps) {
	const [hoveredItem, setHoveredItem] = useState<string | null>(null);
	const [subMenuPosition, setSubMenuPosition] = useState<{ x: number; y: number } | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const hoverTimeoutRef = useRef<number | null>(null);

	const handleMouseEnter = useCallback((item: FunctionTreeNode, event: React.MouseEvent) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}

		if (item.type === 'group') {
			const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
			setHoveredItem(item.path.join('::'));
			setSubMenuPosition({ x: rect.right - 4, y: rect.top });
		} else {
			setHoveredItem(item.fullName);
			setSubMenuPosition(null);
		}
	}, []);

	const handleMouseLeave = useCallback(() => {
		hoverTimeoutRef.current = window.setTimeout(() => {
			setHoveredItem(null);
			setSubMenuPosition(null);
		}, 150);
	}, []);

	const handleSubMenuMouseEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
	}, []);

	// Adjust position if menu would overflow viewport
	const adjustedPosition = { ...position };
	if (menuRef.current) {
		const rect = menuRef.current.getBoundingClientRect();
		if (position.x + rect.width > window.innerWidth) {
			adjustedPosition.x = position.x - rect.width - 180;
		}
		if (position.y + rect.height > window.innerHeight) {
			adjustedPosition.y = Math.max(10, window.innerHeight - rect.height - 10);
		}
	}

	return (
		<div
			ref={menuRef}
			className="node-selection-menu"
			style={{
				...menuTheme.container,
				left: `${adjustedPosition.x}px`,
				top: `${adjustedPosition.y}px`,
			}}
			onMouseEnter={handleSubMenuMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{items.map((item) => {
				if (item.type === 'group') {
					const isHovered = hoveredItem === item.path.join('::');
					return (
						<div key={item.path.join('::')}>
							<button
								style={{
									...menuTheme.menuItem,
									...(isHovered ? menuTheme.menuItemHover : {}),
								}}
								onMouseEnter={(e) => handleMouseEnter(item, e)}
							>
								<span>{item.name}</span>
								<span style={menuTheme.menuItemArrow}>▶</span>
							</button>
							{isHovered && subMenuPosition && (
								<SubMenu
									items={item.children}
									position={subMenuPosition}
									onSelectFunction={onSelectFunction}
									onClose={onClose}
									toFunctionInfo={toFunctionInfo}
								/>
							)}
						</div>
					);
				}

				const isHovered = hoveredItem === item.fullName;
				return (
					<button
						key={item.fullName}
						style={{
							...menuTheme.menuItem,
							...(isHovered ? menuTheme.menuItemHover : {}),
						}}
						onMouseEnter={(e) => handleMouseEnter(item, e)}
						onClick={() => {
							onSelectFunction(toFunctionInfo(item.fullName, item.params, item.displayName));
							onClose();
						}}
					>
						<span>{item.displayName}</span>
					</button>
				);
			})}
		</div>
	);
}

export function NodeSelectionMenu({
	position,
	onSelectFunction,
	onSelectBasicNode,
	onClose,
	editorContext
}: NodeSelectionMenuProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
	const [subMenuPosition, setSubMenuPosition] = useState<{ x: number; y: number } | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const hoverTimeoutRef = useRef<number | null>(null);

	const sceneConfig = editorContext?.sceneKey ? levelRegistry.get(editorContext.sceneKey) : undefined;
	const restrictions = sceneConfig?.editorRestrictions;
	const allowedNodeTypes = sceneConfig?.allowedNodeTypes;
	const tree = getFunctionTreeForMenu(restrictions);

	const filteredBasicNodes = allowedNodeTypes
		? BASIC_NODES.filter(node => allowedNodeTypes.includes(node.type))
		: BASIC_NODES;

	const toFunctionInfo = useCallback((fullName: string, params: string[], displayName: string): FunctionInfo => {
		const parts = fullName.split('::').filter(Boolean);
		const namespace = parts[0] || 'user';
		return {
			name: fullName,
			displayName,
			namespace,
			paramCount: params.length,
			params,
			isNative: true,
		};
	}, []);

	// Flatten tree for search - only returns function nodes
	const flattenTree = useCallback((nodes: FunctionTreeNode[]): FunctionNode[] => {
		const result: FunctionNode[] = [];
		for (const node of nodes) {
			if (node.type === 'group') {
				result.push(...flattenTree(node.children));
			} else {
				result.push(node);
			}
		}
		return result;
	}, []);

	const allFunctions = flattenTree(tree);

	// Filter functions based on search query
	const filteredFunctions: FunctionNode[] = searchQuery
		? allFunctions.filter(fn =>
			fn.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
			fn.fullName.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: [];

	// Filter basic nodes based on search query
	const searchFilteredBasicNodes = searchQuery
		? filteredBasicNodes.filter(node =>
			node.label.toLowerCase().includes(searchQuery.toLowerCase())
		)
		: [];

	// Focus search input on mount
	useEffect(() => {
		searchInputRef.current?.focus();
	}, []);

	const handleCategoryMouseEnter = useCallback((category: string, event: React.MouseEvent) => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}

		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		setHoveredCategory(category);
		setSubMenuPosition({ x: rect.right - 4, y: rect.top });
	}, []);

	const handleCategoryMouseLeave = useCallback(() => {
		hoverTimeoutRef.current = window.setTimeout(() => {
			setHoveredCategory(null);
			setSubMenuPosition(null);
		}, 150);
	}, []);

	const handleSubMenuMouseEnter = useCallback(() => {
		if (hoverTimeoutRef.current) {
			clearTimeout(hoverTimeoutRef.current);
		}
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

	// Render search results
	const renderSearchResults = () => (
		<>
			{searchFilteredBasicNodes.length > 0 && (
				<>
					<div style={menuTheme.sectionLabel}>Basic Nodes</div>
					{searchFilteredBasicNodes.map(node => (
						<button
							key={node.type}
							style={menuTheme.menuItem}
							onClick={() => {
								onSelectBasicNode(node.type);
								onClose();
							}}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = menuTheme.menuItemHover.backgroundColor)}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							<span>
								<span style={menuTheme.menuItemIcon}>{node.icon}</span>
								{node.label}
							</span>
						</button>
					))}
				</>
			)}
			{filteredFunctions.length > 0 && (
				<>
					{searchFilteredBasicNodes.length > 0 && <div style={menuTheme.divider} />}
					<div style={menuTheme.sectionLabel}>Functions</div>
					{filteredFunctions.slice(0, 20).map(fn => (
						<button
							key={fn.fullName}
							style={menuTheme.menuItem}
							onClick={() => {
								onSelectFunction(toFunctionInfo(fn.fullName, fn.params, fn.displayName));
								onClose();
							}}
							onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = menuTheme.menuItemHover.backgroundColor)}
							onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
						>
							<span>{fn.displayName}</span>
							<span style={{ ...menuTheme.menuItemArrow, fontSize: '11px', color: '#9ca3af' }}>
								{fn.fullName.split('::').slice(0, -1).join('::')}
							</span>
						</button>
					))}
					{filteredFunctions.length > 20 && (
						<div style={{ ...menuTheme.sectionLabel, textAlign: 'center' }}>
							...and {filteredFunctions.length - 20} more
						</div>
					)}
				</>
			)}
			{searchFilteredBasicNodes.length === 0 && filteredFunctions.length === 0 && (
				<div style={{ ...menuTheme.sectionLabel, textAlign: 'center', padding: '20px' }}>
					No results found
				</div>
			)}
		</>
	);

	// Render normal menu (categories with submenus)
	const renderNormalMenu = () => (
		<>
			{/* Basic Nodes category */}
			<div
				onMouseEnter={(e) => handleCategoryMouseEnter('basic', e)}
				onMouseLeave={handleCategoryMouseLeave}
			>
				<button
					style={{
						...menuTheme.menuItem,
						...(hoveredCategory === 'basic' ? menuTheme.menuItemHover : {}),
					}}
				>
					<span>Basic Nodes</span>
					<span style={menuTheme.menuItemArrow}>▶</span>
				</button>
				{hoveredCategory === 'basic' && subMenuPosition && (
					<div
						className="node-selection-menu"
						style={{
							...menuTheme.container,
							position: 'fixed',
							left: `${subMenuPosition.x}px`,
							top: `${subMenuPosition.y}px`,
						}}
						onMouseEnter={handleSubMenuMouseEnter}
						onMouseLeave={handleCategoryMouseLeave}
					>
						{filteredBasicNodes.map(node => (
							<button
								key={node.type}
								style={menuTheme.menuItem}
								onClick={() => {
									onSelectBasicNode(node.type);
									onClose();
								}}
								onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = menuTheme.menuItemHover.backgroundColor)}
								onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
							>
								<span>
									<span style={menuTheme.menuItemIcon}>{node.icon}</span>
									{node.label}
								</span>
							</button>
						))}
					</div>
				)}
			</div>

			<div style={menuTheme.divider} />

			{/* Function categories */}
			{tree.map((node) => {
				if (node.type !== 'group') return null;

				const categoryKey = node.path.join('::');
				const isHovered = hoveredCategory === categoryKey;

				return (
					<div
						key={categoryKey}
						onMouseEnter={(e) => handleCategoryMouseEnter(categoryKey, e)}
						onMouseLeave={handleCategoryMouseLeave}
					>
						<button
							style={{
								...menuTheme.menuItem,
								...(isHovered ? menuTheme.menuItemHover : {}),
							}}
						>
							<span>{node.name}</span>
							<span style={menuTheme.menuItemArrow}>▶</span>
						</button>
						{isHovered && subMenuPosition && (
							<SubMenu
								items={node.children}
								position={subMenuPosition}
								onSelectFunction={onSelectFunction}
								onClose={onClose}
								toFunctionInfo={toFunctionInfo}
							/>
						)}
					</div>
				);
			})}
		</>
	);

	return (
		<div
			ref={menuRef}
			className="node-selection-menu"
			style={{
				...menuTheme.container,
				left: `${adjustedPosition.x}px`,
				top: `${adjustedPosition.y}px`,
			}}
		>
			{/* Search input */}
			<div style={menuTheme.searchContainer}>
				<input
					ref={searchInputRef}
					type="text"
					placeholder="Search..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					style={menuTheme.searchInput}
					onFocus={(e) => {
						e.target.style.borderColor = '#93c5fd';
						e.target.style.boxShadow = '0 0 0 3px rgba(147, 197, 253, 0.2)';
					}}
					onBlur={(e) => {
						e.target.style.borderColor = '#e8d5e0';
						e.target.style.boxShadow = 'none';
					}}
				/>
			</div>

			{/* Menu content */}
			{searchQuery ? renderSearchResults() : renderNormalMenu()}
		</div>
	);
}
