// =============================================
// Dynamic Function Node Component
//  -
// =============================================

import { Handle, Position } from 'reactflow';
import { memo, useState, useEffect } from 'react';
import type { NodeProps } from 'reactflow';
import { useStore } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';
import type { ParameterMode, ParameterModeOption } from '../../utils/getFunctionRegistry';
import { getFunctionInfo } from '../../utils/getFunctionRegistry';
import type { TriggerTypeNodeData } from '../../types/flowTypes';

export interface DynamicFunctionNodeData {
	functionName: string;      //  (e.g., 'std::math::add')
	displayName: string;       //  (e.g., 'add')
	namespace: string;         //  (e.g., 'std')
	params: string[];          //
	isVariadic?: boolean;      //
	parameterModes?: Record<string, { current: ParameterMode; options: ParameterModeOption[] }>;  // Parameter modes
}

export const DynamicFunctionNode = memo(({ data, id }: NodeProps) => {
	const nodeData = data as DynamicFunctionNodeData;

	const {
		displayName,
		namespace,
		params,
		isVariadic = false,
		functionName
	} = nodeData;

	// Check if this is onTrigger function
	const isOnTrigger = functionName === 'game::onTrigger';

	// Subscribe to both edges and the specific triggerType node's data for immediate updates
	// Return a primitive value (string) to ensure useStore properly detects changes
	const triggerType = useStore((store) => {
		if (!isOnTrigger) return null;
		
		// Find the connected triggerType edge
		const triggerTypeEdge = store.edges.find(e => e.target === id && e.targetHandle === 'arg0');
		if (!triggerTypeEdge) return null;

		// Get the connected triggerType node
		const triggerTypeNode = store.nodeInternals.get(triggerTypeEdge.source);
		if (!triggerTypeNode || triggerTypeNode.type !== 'triggerType') return null;

		// Return the triggerType value as a string - primitive values ensure proper change detection
		const triggerData = triggerTypeNode.data as TriggerTypeNodeData;
		return triggerData?.triggerType || null;
	});

	// Condition hints based on trigger type
	const getConditionHint = (triggerType: string | null): string | null => {
		if (!triggerType) return null;
		
		switch (triggerType) {
			case 'onEnemyNearby':
				return 'Distance in pixels (e.g., 200 = trigger when enemy within 200px)';
			case 'onTimeInterval':
				return 'Interval in milliseconds (e.g., 2000 = trigger every 2 seconds)';
			case 'onPlayerHurt':
				return 'No condition needed - triggers automatically when player takes damage';
			case 'onEnemyKilled':
				return 'No condition needed - triggers automatically when any enemy is killed';
			case 'onPlayerLowHealth':
				return 'Health threshold (0.0-1.0, e.g., 0.5 = trigger when health < 50%)';
			default:
				return null;
		}
	};

	const conditionHint = getConditionHint(triggerType);

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

	// Determine color based on namespace
	const getNamespaceColor = () => {
		switch (namespace) {
			case 'std':
				return {
					bg: 'bg-blue-50',
					border: 'border-blue-400',
					text: 'text-blue-700',
					handle: 'bg-blue-500'
				};
			case 'game':
				return {
					bg: 'bg-purple-50',
					border: 'border-purple-400',
					text: 'text-purple-700',
					handle: 'bg-purple-500'
				};
			case 'math':
				return {
					bg: 'bg-green-50',
					border: 'border-green-400',
					text: 'text-green-700',
					handle: 'bg-green-500'
				};
			default:
				return {
					bg: 'bg-gray-50',
					border: 'border-gray-400',
					text: 'text-gray-700',
					handle: 'bg-gray-500'
				};
		}
	};
	
	const colors = getNamespaceColor();

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
		<div className={`px-4 py-3 shadow-md rounded-lg ${colors.bg} border-2 ${colors.border} min-w-[200px]`}>
			{/* Function name header */}
			<div className={`font-bold text-sm ${colors.text} mb-2 text-center`}>
				{displayName}
			</div>

			{/* Namespace badge */}
			<div className={`text-xs ${colors.text} opacity-60 text-center mb-3`}>
				{namespace}::
			</div>

			{/* Input parameters with mode selectors */}
			{paramGroups.length > 0 && (
				<div className="space-y-2 mb-2">
					{paramGroups.map((group, groupIndex) => {
						const modeOptions = getParamModeOptions(group.originalParam);
						const currentMode = paramModes[group.originalParam];

						return (
							<div key={groupIndex} className="space-y-1">
								{/* Special hint for onTrigger triggerType parameter */}
								{isOnTrigger && group.originalParam === 'triggerType' && (
									<div className={`text-xs ${colors.text} opacity-60 mb-1 px-1`}>
										💡 Connect a <strong>Trigger Type</strong> node<br/>
										(Right-click → Basic Nodes → Trigger Type)
									</div>
								)}

								{/* Special hint for onTrigger condition parameter */}
								{isOnTrigger && group.originalParam === 'condition' && (
									<div className={`text-xs ${colors.text} opacity-70 mb-1 px-1 py-1 rounded`} style={{ backgroundColor: `${colors.text}15` }}>
										{conditionHint ? (
											<>
												📋 <strong>Condition:</strong> {conditionHint}
											</>
										) : (
											<>
												📋 <strong>Condition:</strong> Connect a Trigger Type node first to see condition requirements
											</>
										)}
									</div>
								)}

								{/* Special hint for onTrigger action parameter */}
								{isOnTrigger && group.originalParam === 'action' && (
									<div className={`text-xs ${colors.text} opacity-70 mb-1 px-1 py-1 rounded`} style={{ backgroundColor: `${colors.text}15` }}>
										⚡ <strong>Action:</strong> Connect an action function (e.g., teleportRelative) or a Lambda node<br/>
										This action will be executed when the trigger fires.
									</div>
								)}

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
										className={`w-full text-xs px-2 py-1 rounded border ${colors.border} ${colors.bg} ${colors.text} cursor-pointer`}
										onClick={(e) => e.stopPropagation()}
									>
										{modeOptions.map(option => (
											<option key={option.mode} value={option.mode}>
												{option.label}
											</option>
										))}
									</select>
								)}

								{/* Parameter handles */}
								{group.params.map((param) => (
									<div key={param.index} className="flex items-center relative h-6">
										<Handle
											type="target"
											position={Position.Left}
											id={`arg${param.index}`}
											className={`w-3 h-3 ${colors.handle} absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2`}
										/>
										<div className={`ml-3 text-xs ${colors.text} opacity-70`}>
											{param.name}
											{isVariadic && <span className="opacity-50">?</span>}
										</div>
									</div>
								))}
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
				className={`w-3 h-3 ${colors.handle}`}
				nodeId={id}
			/>
		</div>
	);
});

DynamicFunctionNode.displayName = 'DynamicFunctionNode';
