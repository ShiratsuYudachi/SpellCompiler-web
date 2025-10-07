// =============================================
// Function Output Node Component
// 函数输出节点 - 标记函数的返回值
// =============================================

import { Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { SmartHandle } from '../handles/SmartHandle';

interface FunctionOutNodeData {
	functionName?: string;
}

export function FunctionOutNode({ id }: NodeProps<FunctionOutNodeData>) {
	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-indigo-50 border-2 border-indigo-400 min-w-[160px]">
			<div className="font-bold text-sm text-indigo-700 mb-2 text-center">
				↩️ Return
			</div>

			{/* Input handle for return value */}
			<div className="flex items-center justify-center">
				<SmartHandle
					type="target"
					position={Position.Left}
					id="value"
					className="w-3 h-3 bg-indigo-500"
					nodeId={id}
				/>
				<span className="ml-2 text-xs text-indigo-600">value</span>
			</div>
		</div>
	);
}
