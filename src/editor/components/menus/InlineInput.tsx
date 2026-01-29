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
	// Vector state
	const [x, setX] = useState<number>(() => {
		if (typeof value === 'object' && value !== null && 'x' in value) {
			return value.x;
		}
		return 0;
	});
	const [y, setY] = useState<number>(() => {
		if (typeof value === 'object' && value !== null && 'y' in value) {
			return value.y;
		}
		return 0;
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
			setX(value.x);
			setY(value.y);
		} else if (type === 'literal' && (typeof value === 'number' || typeof value === 'string')) {
			setLiteralValue(value);
		}
	}, [value, type]);

	const handleXChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (!isNaN(num)) {
			setX(num);
			onChange({ x: num, y });
		} else if (newValue === '' || newValue === '-') {
			setX(0);
			onChange({ x: 0, y });
		}
	};

	const handleYChange = (newValue: string) => {
		const num = parseFloat(newValue);
		if (!isNaN(num)) {
			setY(num);
			onChange({ x, y: num });
		} else if (newValue === '' || newValue === '-') {
			setY(0);
			onChange({ x, y: 0 });
		}
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
					type="number"
					value={x}
					onChange={(e) => handleXChange(e.target.value)}
					className={`w-12 px-1 py-0.5 text-xs border ${colors.border} rounded focus:outline-none opacity-80`}
					placeholder="X"
					step="any"
					onClick={(e) => e.stopPropagation()}
					onMouseDown={(e) => e.stopPropagation()}
				/>
				<input
					type="number"
					value={y}
					onChange={(e) => handleYChange(e.target.value)}
					className={`w-12 px-1 py-0.5 text-xs border ${colors.border} rounded focus:outline-none opacity-80`}
					placeholder="Y"
					step="any"
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
