// =============================================
// Dynamic Function Node Component
//  -
// =============================================

import { Handle, Position, useStore } from 'reactflow';
import { memo, useState, useEffect, useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';
import type { ParameterMode, ParameterModeOption } from '../../utils/getFunctionRegistry';
import { getFunctionInfo } from '../../utils/getFunctionRegistry';
import { InlineInput, type InlineInputType } from '../menus/InlineInput';
import type { InlineValue } from '../../types/flowTypes';
import { inferParamType, shouldShowInlineInput } from '../../utils/paramTypeInfer';
import { getPixelBoxStyle, getPixelInputStyle, getPixelHeaderStyle, EditorColors } from '../../utils/EditorTheme';

export interface DynamicFunctionNodeData {
	functionName: string;      //  (e.g., 'std::math::add')
	displayName: string;       //  (e.g., 'add')
	namespace: string;         //  (e.g., 'std')
	params: string[];          //
	isVariadic?: boolean;      //
	parameterModes?: Record<string, { current: ParameterMode; options: ParameterModeOption[] }>;  // Parameter modes
	inlineValues?: Record<string, InlineValue>;  // Inline input values
}

export const DynamicFunctionNode = memo(({ data, id }: NodeProps) => {
	const nodeData = data as DynamicFunctionNodeData;
	// Only re-render when edges connecting to this node change (not on node position drag)
	const connectedHandleIdsStr = useStore(
		useCallback((state: { edges: Array<{ target: string; targetHandle?: string | null }> }) => {
			const ids: string[] = [];
			for (const e of state.edges) {
				if (e.target === id && e.targetHandle) ids.push(e.targetHandle);
			}
			return ids.sort().join(',');
		}, [id]),
		(a: string, b: string) => a === b
	);

	const {
		displayName,
		namespace,
		params,
		isVariadic = false,
		functionName
	} = nodeData;

	// Check if a specific handle has an edge connected
	const isHandleConnected = useCallback((handleId: string) => {
		return connectedHandleIdsStr.split(',').includes(handleId);
	}, [connectedHandleIdsStr]);

	// Handle inline value changes
	const handleInlineValueChange = useCallback((paramName: string, value: InlineValue) => {
		if (!nodeData.inlineValues) {
			nodeData.inlineValues = {};
		}
		nodeData.inlineValues[paramName] = value;
	}, [nodeData]);

	// Get inline value for a parameter
	const getInlineValue = useCallback((paramName: string): InlineValue | undefined => {
		return nodeData.inlineValues?.[paramName];
	}, [nodeData.inlineValues]);

	// Initialize parameter modes from function registry
	const [paramModes, setParamModes] = useState<Record<string, ParameterMode>>(() => {
		const funcInfo = getFunctionInfo(functionName);
		const initial: Record<string, ParameterMode> = {};

		if (funcInfo?.parameterModes) {
			Object.keys(funcInfo.parameterModes).forEach(paramName => {
				// Use existing mode from node data, or default to 'vector' mode
				initial[paramName] = nodeData.parameterModes?.[paramName]?.current || 'vector';
			});
		}

		return initial;
	});

	// Auto-initialize parameterModes for old nodes that don't have it
	useEffect(() => {
		const funcInfo = getFunctionInfo(functionName);
		if (funcInfo?.parameterModes && !nodeData.parameterModes) {
			// Old node without parameterModes - initialize it
			const modeData: Record<string, { current: ParameterMode; options: ParameterModeOption[] }> = {};
			const newParamModes: Record<string, ParameterMode> = {};

			Object.keys(funcInfo.parameterModes).forEach(paramName => {
				modeData[paramName] = {
					current: 'vector', // Default to vector mode
					options: funcInfo.parameterModes![paramName]
				};
				newParamModes[paramName] = 'vector';
			});

			nodeData.parameterModes = modeData;

			// Immediately update paramModes state to trigger re-render
			setParamModes(newParamModes);
		}
	}, [functionName, nodeData]);

	// Update node data when mode changes
	useEffect(() => {
		const funcInfo = getFunctionInfo(functionName);
		if (funcInfo?.parameterModes) {
			const modeData: Record<string, { current: ParameterMode; options: ParameterModeOption[] }> = {};

			Object.keys(funcInfo.parameterModes).forEach(paramName => {
				modeData[paramName] = {
					current: paramModes[paramName],
					options: funcInfo.parameterModes![paramName]
				};
			});

			nodeData.parameterModes = modeData;
		}
	}, [paramModes, functionName, nodeData]);

	// Get parameter mode options for a given parameter
	const getParamModeOptions = (paramName: string): ParameterModeOption[] | undefined => {
		const funcInfo = getFunctionInfo(functionName);
		return funcInfo?.parameterModes?.[paramName];
	};

	// Human-readable labels for list/generic params so "l" is not mistaken for "|"
	const getParamDisplayLabel = (paramName: string): string => {
		if (namespace === 'list') {
			const map: Record<string, string> = { l: 'list', pred: 'predicate', f: 'function', init: 'init', head: 'head', tail: 'tail', arr: 'array' };
			return map[paramName] ?? paramName;
		}
		return paramName;
	};

	// Get actual parameters to display based on modes
	const getDisplayParams = (): Array<{ name: string; index: number; originalParam: string }> => {
		if (isVariadic) {
			return [
				{ name: 'arg0', index: 0, originalParam: 'arg0' },
				{ name: 'arg1', index: 1, originalParam: 'arg1' },
				{ name: 'arg2', index: 2, originalParam: 'arg2' },
				{ name: 'arg3', index: 3, originalParam: 'arg3' }
			];
		}

		const result: Array<{ name: string; index: number; originalParam: string }> = [];
		let handleIndex = 0;

		params.forEach((paramName) => {
			const modeOptions = getParamModeOptions(paramName);

			if (modeOptions) {
				const currentMode = paramModes[paramName] || 'vector';
				const selectedOption = modeOptions.find(opt => opt.mode === currentMode);

				if (selectedOption) {
					selectedOption.params.forEach(actualParamName => {
						result.push({
							name: actualParamName,
							index: handleIndex++,
							originalParam: paramName
						});
					});
				}
			} else {
				result.push({
					name: paramName,
					index: handleIndex++,
					originalParam: paramName
				});
			}
		});

		return result;
	};

	// Determine category based on namespace
	const getNamespaceCategory = (): keyof typeof EditorColors => {
		switch (namespace) {
			case 'std': return 'data';
			case 'game': return 'control';
			case 'math': return 'logic';
			case 'list': return 'logic';
			default: return 'data';
		}
	};

	const category = getNamespaceCategory();
	const categoryTheme = (EditorColors as any)[category];

	const displayParams = getDisplayParams();

	// Group parameters by original param for mode selector
	const paramGroups: Array<{ originalParam: string; params: typeof displayParams }> = [];
	const seenOriginal = new Set<string>();

	displayParams.forEach(param => {
		if (!seenOriginal.has(param.originalParam)) {
			seenOriginal.add(param.originalParam);
			paramGroups.push({
				originalParam: param.originalParam,
				params: displayParams.filter(p => p.originalParam === param.originalParam)
			});
		}
	});

	return (
		<div style={getPixelBoxStyle(category)}>
			{/* Function name header */}
			<div style={getPixelHeaderStyle(category)}>
				{displayName}
			</div>

			{/* Namespace badge */}
			{namespace ? (
				<div style={{ fontSize: '8px', color: categoryTheme.border, opacity: 0.6, marginBottom: '12px' }}>
					{namespace}
				</div>
			) : null}

			{/* Input parameters with mode selectors */}
			{paramGroups.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
					{paramGroups.map((group, groupIndex) => {
						const modeOptions = getParamModeOptions(group.originalParam);
						const currentMode = paramModes[group.originalParam];

						return (
							<div key={groupIndex} style={{ borderBottom: groupIndex < paramGroups.length - 1 ? '1px dashed rgba(255,255,255,0.1)' : 'none', paddingBottom: 8 }}>
								{/* Mode selector if available */}
								{modeOptions && modeOptions.length > 1 && (
									<select
										value={currentMode || 'vector'}
										onChange={(e) => {
											const newMode = e.target.value as ParameterMode;
											setParamModes(prev => ({
												...prev,
												[group.originalParam]: newMode
											}));
										}}
										style={{
											...getPixelInputStyle(),
											marginBottom: 8,
											color: categoryTheme.border
										}}
										onClick={(e) => e.stopPropagation()}
									>
										{modeOptions.map(option => (
											<option key={option.mode} value={option.mode}>
												{option.label}
											</option>
										))}
									</select>
								)}

								{/* Parameter handles with inline inputs */}
								{group.params.map((param) => {
									const handleId = `arg${param.index}`;
									const connected = isHandleConnected(handleId);

									// Infer parameter type to determine inline input behavior
									const paramType = inferParamType(param.originalParam);
									const showInline = shouldShowInlineInput(paramType);

									// Map paramType to InlineInputType
									let inputType: InlineInputType;
									if (paramType === 'Vector2D') {
										inputType = 'vector';
									} else {
										inputType = 'literal'; // number and string both use literal input
									}

									return (
										<div key={param.index} style={{ position: 'relative', height: '28px', display: 'flex', alignItems: 'center' }}>
											<Handle
												type="target"
												position={Position.Left}
												id={handleId}
												style={{ left: -10, width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: `2px solid ${categoryTheme.border}` }}
											/>
											<div style={{ marginLeft: 15, fontSize: '8px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '8px' }}>
												<span style={{ color: categoryTheme.border }}>
													{getParamDisplayLabel(param.name)}
													{isVariadic && <span className="opacity-50">?</span>}
												</span>
												{/* Inline input */}
												{!connected && !isVariadic && showInline && (
													<InlineInput
														type={inputType}
														value={getInlineValue(param.originalParam)}
														onChange={(value) => handleInlineValueChange(param.originalParam, value)}
														disabled={connected}
														colors={{ border: categoryTheme.border, text: '#ffffff' }}
													/>
												)}
											</div>
										</div>
									);
								})}
							</div>
						);
					})}
				</div>
			)}

			{/* Output handle */}
			<SmartHandle
				type="source"
				position={Position.Right}
				id="result"
				nodeId={id}
				style={{ border: `2px solid ${categoryTheme.border}` }}
			/>
		</div>
	);
});

DynamicFunctionNode.displayName = 'DynamicFunctionNode';
