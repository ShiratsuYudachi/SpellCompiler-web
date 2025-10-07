// =============================================
// Dynamic Function Node Component
// 动态函数节点 - 根据函数定义自动生成参数
// =============================================

import { Handle, Position } from 'reactflow';
import { memo } from 'react';
import type { NodeProps } from 'reactflow';

export interface DynamicFunctionNodeData {
	functionName: string;      // 完整函数名 (e.g., 'std::add')
	displayName: string;       // 显示名称 (e.g., 'add')
	namespace: string;         // 命名空间 (e.g., 'std')
	params: string[];          // 参数名称列表
	isVariadic?: boolean;      // 是否是可变参数函数
}

export const DynamicFunctionNode = memo(({ data }: NodeProps) => {
	const nodeData = data as DynamicFunctionNodeData;
	
	const {
		displayName,
		namespace,
		params,
		isVariadic = false
	} = nodeData;
	
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
	
	// For variadic functions, show 4 optional parameters
	const displayParams = isVariadic 
		? ['arg0', 'arg1', 'arg2', 'arg3']
		: params.length > 0 
			? params 
			: ['arg0']; // At least one handle for 0-param functions
	
	return (
		<div className={`px-4 py-3 shadow-md rounded-lg ${colors.bg} border-2 ${colors.border} min-w-[160px]`}>
			{/* Function name header */}
			<div className={`font-bold text-sm ${colors.text} mb-2 text-center`}>
				{displayName}
			</div>
			
			{/* Namespace badge */}
			<div className={`text-xs ${colors.text} opacity-60 text-center mb-3`}>
				{namespace}::
			</div>
			
		{/* Input handles for parameters */}
		{displayParams.length > 0 && (
			<div className="space-y-1 mb-2">
				{displayParams.map((paramName, index) => (
					<div key={index} className="flex items-center relative h-6">
						<Handle
							type="target"
							position={Position.Left}
							id={`arg${index}`}
							className={`w-3 h-3 ${colors.handle} absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2`}
						/>
						<div className={`ml-3 text-xs ${colors.text} opacity-70`}>
							{paramName}
							{isVariadic && <span className="opacity-50">?</span>}
						</div>
					</div>
				))}
			</div>
		)}

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="result"
				className={`w-3 h-3 ${colors.handle}`}
			/>
		</div>
	);
});

DynamicFunctionNode.displayName = 'DynamicFunctionNode';
