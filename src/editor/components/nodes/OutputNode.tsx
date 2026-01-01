// =============================================
// Output Node Component
//  - 
// =============================================

import { Handle, Position } from 'reactflow';

export function OutputNode() {
	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-purple-50 border-2 border-purple-400 min-w-[140px]">
			<div className="font-bold text-sm text-purple-700 text-center">
				📤 Output
			</div>
			
			{/* Input handle */}
			<Handle
				type="target"
				position={Position.Left}
				id="value"
				className="w-3 h-3 bg-purple-500"
			/>
		</div>
	);
}
