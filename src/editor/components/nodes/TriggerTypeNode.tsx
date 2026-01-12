// =============================================
// Trigger Type Node Component
// 用于选择触发器类型
// =============================================

import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import type { NodeProps } from 'reactflow';
import type { TriggerTypeNodeData } from '../../types/flowTypes';

const TRIGGER_TYPES = [
	{ value: 'onEnemyNearby', label: 'onEnemyNearby', description: 'Trigger when enemy is nearby' },
	{ value: 'onTimeInterval', label: 'onTimeInterval', description: 'Trigger at time intervals' },
	{ value: 'onPlayerHurt', label: 'onPlayerHurt', description: 'Trigger when player takes damage' },
	{ value: 'onEnemyKilled', label: 'onEnemyKilled', description: 'Trigger when enemy is killed' },
	{ value: 'onPlayerLowHealth', label: 'onPlayerLowHealth', description: 'Trigger when health is low' },
] as const;

export function TriggerTypeNode({ data }: NodeProps) {
	const nodeData = data as TriggerTypeNodeData;
	const [selectedType, setSelectedType] = useState(nodeData.triggerType ?? 'onEnemyNearby');

	const handleChange = (newType: string) => {
		setSelectedType(newType);
		nodeData.triggerType = newType;
	};

	const selectedTrigger = TRIGGER_TYPES.find(t => t.value === selectedType);

	return (
		<div className="px-4 py-3 shadow-md rounded-lg bg-orange-50 border-2 border-orange-400 min-w-[200px]">
			<div className="font-bold text-sm text-orange-700 mb-2">
				⚡ Trigger Type
			</div>
			
			<select
				value={selectedType}
				onChange={(e) => handleChange(e.target.value)}
				className="w-full px-2 py-1.5 text-sm border border-orange-300 rounded focus:outline-none focus:border-orange-500 bg-white"
				onClick={(e) => e.stopPropagation()}
			>
				{TRIGGER_TYPES.map(trigger => (
					<option key={trigger.value} value={trigger.value}>
						{trigger.label}
					</option>
				))}
			</select>

			{/* Description */}
			{selectedTrigger && (
				<div className="text-xs text-orange-600 mt-2 opacity-70">
					{selectedTrigger.description}
				</div>
			)}

			{/* Output handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="value"
				className="w-3 h-3 bg-orange-500"
			/>
		</div>
	);
}
