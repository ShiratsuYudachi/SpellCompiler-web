// =============================================
// If Expression Node Component
// 条件表达式节点
// =============================================

import { Handle, Position } from 'reactflow';

export function FlowIfNode() {
	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-red-50 border-2 border-red-400 min-w-[160px]">
			<div className="font-bold text-sm text-red-700 mb-2 text-center">
				🔀 If Expression
			</div>
			
			{/* Input handles */}
			<div className="space-y-2 mb-3">
				<div className="flex items-center relative">
					<Handle
						type="target"
						position={Position.Left}
						id="condition"
						style={{ top: '40px' }}
						className="w-3 h-3 bg-red-500 -left-1.5"
					/>
					<div className="ml-3 text-xs text-red-600">
						condition
					</div>
				</div>
				
				<div className="flex items-center relative">
					<Handle
						type="target"
						position={Position.Left}
						id="then"
						style={{ top: '64px' }}
						className="w-3 h-3 bg-green-500 -left-1.5"
					/>
					<div className="ml-3 text-xs text-green-600">
						then
					</div>
				</div>
				
				<div className="flex items-center relative">
					<Handle
						type="target"
						position={Position.Left}
						id="else"
						style={{ top: '88px' }}
						className="w-3 h-3 bg-blue-500 -left-1.5"
					/>
					<div className="ml-3 text-xs text-blue-600">
						else
					</div>
				</div>
			</div>

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="result"
				className="w-3 h-3 bg-red-500"
			/>
		</div>
	);
}
