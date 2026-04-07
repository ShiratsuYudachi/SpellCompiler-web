// =============================================
// If Expression Node Component
// 
// =============================================

import { Handle, Position } from 'reactflow';
import { getPixelBoxStyle, getPixelHeaderStyle } from '../../utils/EditorTheme';

export function IfNode() {
	return (
		<div style={getPixelBoxStyle('control')}>
			<div style={getPixelHeaderStyle('control')}>
				🔀 If Expr
			</div>
			
			<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
				<div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
					<Handle
						type="target"
						position={Position.Left}
						id="condition"
						style={{ left: -10, width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #ff5c5c' }}
					/>
					<div style={{ marginLeft: 10, fontSize: '8px', color: '#ff5c5c' }}>condition</div>
				</div>
				
				<div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
					<Handle
						type="target"
						position={Position.Left}
						id="then"
						style={{ left: -10, width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #48cc48' }}
					/>
					<div style={{ marginLeft: 10, fontSize: '8px', color: '#48cc48' }}>then</div>
				</div>
				
				<div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
					<Handle
						type="target"
						position={Position.Left}
						id="else"
						style={{ left: -10, width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #4facfe' }}
					/>
					<div style={{ marginLeft: 10, fontSize: '8px', color: '#4facfe' }}>else</div>
				</div>
			</div>

			<Handle
				type="source"
				position={Position.Right}
				id="result"
				style={{ width: 12, height: 12, borderRadius: 0, background: '#ffffff', border: '2px solid #ff5c5c' }}
			/>
		</div>
	);
}
