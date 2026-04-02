// =============================================
// Inline Input Component
// Renders inline input fields for node parameters
// =============================================

import { useState, useEffect, memo } from 'react';
import type { InlineValue } from '../../types/flowTypes';

export type InlineInputType = 'vector' | 'literal';

interface InlineInputProps {
	type: InlineInputType;
	value?: InlineValue;
	onChange: (value: InlineValue) => void;
	disabled?: boolean;  // When edge is connected
	colors: {
		border: string;
		text: string;
	};
}

export const InlineInput = memo(({ type, value, onChange, disabled, colors }: InlineInputProps) => {
	// Vector state (raw strings for free-form typing)
	const [rawX, setRawX] = useState<string>(() => {
		if (typeof value === 'object' && value !== null && 'x' in value) return String(value.x);
		return '0';
	});
	const [rawY, setRawY] = useState<string>(() => {
		if (typeof value === 'object' && value !== null && 'y' in value) return String(value.y);
		return '0';
	});

	// Literal state
	const [literalValue, setLiteralValue] = useState<number | string>(() => {
		if (typeof value === 'number' || typeof value === 'string') {
			return value;
		}
		return 0;
	});

	// Sync from props when value changes externally
	useEffect(() => {
		if (type === 'vector' && typeof value === 'object' && value !== null && 'x' in value) {
			setRawX(String(value.x));
			setRawY(String(value.y));
		} else if (type === 'literal' && (typeof value === 'number' || typeof value === 'string')) {
			setLiteralValue(value);
		}
	}, [value, type]);

	const commitX = (raw: string) => {
		const num = parseFloat(raw);
		const committed = isNaN(num) ? 0 : num;
		if (isNaN(num)) setRawX('0');
		const curY = parseFloat(rawY);
		onChange({ x: committed, y: isNaN(curY) ? 0 : curY });
	};

	const commitY = (raw: string) => {
		const num = parseFloat(raw);
		const committed = isNaN(num) ? 0 : num;
		if (isNaN(num)) setRawY('0');
		const curX = parseFloat(rawX);
		onChange({ x: isNaN(curX) ? 0 : curX, y: committed });
	};

	const handleLiteralChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (!isNaN(num) && newValue !== '') {
			setLiteralValue(num);
			onChange(num);
		} else {
			setLiteralValue(newValue);
			onChange(newValue);
		}
	};

	if (disabled) {
		return null;
	}

	if (type === 'vector') {
		return (
			<div className="flex gap-1 ml-3">
				<input
					type="text"
					value={rawX}
					onChange={(e) => setRawX(e.target.value)}
					onBlur={(e) => commitX(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') commitX((e.target as HTMLInputElement).value); }}
					className={`w-12 px-1 py-0.5 text-xs border ${colors.border} rounded focus:outline-none opacity-80`}
					placeholder="X"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				/>
				<input
					type="text"
					value={rawY}
					onChange={(e) => setRawY(e.target.value)}
					onBlur={(e) => commitY(e.target.value)}
					onKeyDown={(e) => { if (e.key === 'Enter') commitY((e.target as HTMLInputElement).value); }}
					className={`w-12 px-1 py-0.5 text-xs border ${colors.border} rounded focus:outline-none opacity-80`}
					placeholder="Y"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				/>
			</div>
		);
	}

	// Literal input
	return (
		<div className="ml-3">
			<input
				type="text"
				value={typeof literalValue === 'number' ? literalValue : literalValue}
				onChange={(e) => handleLiteralChange(e.target.value)}
				className={`w-20 px-1 py-0.5 text-xs border ${colors.border} rounded focus:outline-none opacity-80`}
				placeholder="Value"
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
			/>
		</div>
	);
});

InlineInput.displayName = 'InlineInput';
