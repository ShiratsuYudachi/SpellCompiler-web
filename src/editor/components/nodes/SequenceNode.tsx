import { memo, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';

interface SequenceNodeData {
	stepCount: number;
}

export const SequenceNode = memo(({ id, data }: NodeProps<SequenceNodeData>) => {
	const { setNodes } = useReactFlow();
	const stepCount = data.stepCount || 2;

	const handleAddStep = useCallback(() => {
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: {
							...node.data,
							stepCount: Math.min((node.data.stepCount || 2) + 1, 10) // 最多10个步骤
						}
					};
				}
				return node;
			})
		);
	}, [id, setNodes]);

	const handleRemoveStep = useCallback(() => {
		setNodes((nodes) =>
			nodes.map((node) => {
				if (node.id === id) {
					return {
						...node,
						data: {
							...node.data,
							stepCount: Math.max((node.data.stepCount || 2) - 1, 1) // 至少1个步骤
						}
					};
				}
				return node;
			})
		);
	}, [id, setNodes]);

	return (
		<div
			style={{
				background: '#FFF4E6',
				border: '2px solid #FD7E14',
				borderRadius: '8px',
				padding: '12px',
				minWidth: '180px',
				boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
			}}
		>
			{/* 标题 */}
			<div
				style={{
					fontWeight: 'bold',
					marginBottom: '10px',
					fontSize: '14px',
					color: '#D9480F',
					display: 'flex',
					alignItems: 'center',
					gap: '6px'
				}}
			>
				<span style={{ fontSize: '16px' }}>📜</span>
				<span>Sequence</span>
			</div>

			{/* 步骤输入 handles */}
			<div style={{ marginBottom: '10px' }}>
				{Array.from({ length: stepCount }).map((_, i) => (
					<div
						key={i}
						style={{
							marginBottom: '6px',
							display: 'flex',
							alignItems: 'center',
							fontSize: '12px',
							color: '#495057'
						}}
					>
						<Handle
							type="target"
							position={Position.Left}
							id={`step${i}`}
							style={{
								background: '#FD7E14',
								width: '10px',
								height: '10px',
								left: '-5px',
								top: `${40 + i * 28}px`
							}}
						/>
						<span style={{ marginLeft: '8px' }}>Step {i + 1}</span>
					</div>
				))}
			</div>

			{/* 控制按钮 */}
			<div
				style={{
					display: 'flex',
					gap: '6px',
					marginBottom: '8px'
				}}
			>
				<button
					onClick={handleAddStep}
					disabled={stepCount >= 10}
					style={{
						flex: 1,
						padding: '4px 8px',
						fontSize: '11px',
						background: stepCount >= 10 ? '#E9ECEF' : '#FFF4E6',
						border: '1px solid #FD7E14',
						borderRadius: '4px',
						cursor: stepCount >= 10 ? 'not-allowed' : 'pointer',
						color: stepCount >= 10 ? '#ADB5BD' : '#D9480F',
						fontWeight: '500'
					}}
					title={stepCount >= 10 ? 'Maximum 10 steps' : 'Add a step'}
				>
					+ Add
				</button>
				<button
					onClick={handleRemoveStep}
					disabled={stepCount <= 1}
					style={{
						flex: 1,
						padding: '4px 8px',
						fontSize: '11px',
						background: stepCount <= 1 ? '#E9ECEF' : '#FFF4E6',
						border: '1px solid #FD7E14',
						borderRadius: '4px',
						cursor: stepCount <= 1 ? 'not-allowed' : 'pointer',
						color: stepCount <= 1 ? '#ADB5BD' : '#D9480F',
						fontWeight: '500'
					}}
					title={stepCount <= 1 ? 'Minimum 1 step' : 'Remove a step'}
				>
					- Remove
				</button>
			</div>

			{/* 输出 handle */}
			<Handle
				type="source"
				position={Position.Right}
				id="output"
				style={{
					background: '#FD7E14',
					width: '12px',
					height: '12px',
					right: '-6px'
				}}
			/>
		</div>
	);
});

SequenceNode.displayName = 'SequenceNode';
