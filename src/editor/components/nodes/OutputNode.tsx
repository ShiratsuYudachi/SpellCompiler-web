// =============================================
// Output Node Component
//  - 
// =============================================

import { Handle, Position } from 'reactflow';
import { getPixelBoxStyle, getPixelHeaderStyle } from '../../utils/EditorTheme';

export function OutputNode() {
	return (
		<div style={getPixelBoxStyle('output')}>
			<div style={getPixelHeaderStyle('output')}>
				📤 Output
			</div>
			
			{/* Input handle */}
			<Handle
				type="target"
				position={Position.Left}
				id="value"
				style={{ left: -10, width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #fa709a' }}
			/>
		</div>
	);
}
