export const PIXEL_FONT = "'Press Start 2P', monospace";

export const EditorColors = {
	bg: '#0d1117', // Deep Blue-Purple Gray (Requested)
	panelBg: 'rgba(13, 17, 23, 0.7)', // Matching Glassmorphic BG
	borderColor: 'rgba(255, 255, 255, 0.08)',
	
	// Categories
	data: {
		border: '#00d2ff',
		bg: 'rgba(0, 210, 255, 0.05)',
		glow: 'rgba(0, 210, 255, 0.2)'
	},
	logic: {
		border: '#48cc48',
		bg: 'rgba(72, 204, 72, 0.05)',
		glow: 'rgba(72, 204, 72, 0.2)'
	},
	control: {
		border: '#ff5c5c',
		bg: 'rgba(255, 92, 92, 0.05)',
		glow: 'rgba(255, 92, 92, 0.2)'
	},
	input: {
		border: '#fee140',
		bg: 'rgba(254, 225, 64, 0.05)',
		glow: 'rgba(254, 225, 64, 0.2)'
	},
	output: {
		border: '#fa709a',
		bg: 'rgba(250, 112, 154, 0.1)',
		glow: 'rgba(250, 112, 154, 0.25)'
	}
};

/**
 * Common style for arcane glassmorphic containers
 */
export const getPixelGlassStyle = (opacity = 0.7, blur = 20) => ({
	backgroundColor: `rgba(13, 17, 23, ${opacity})`,
	backdropFilter: `blur(${blur}px)`,
	border: '1px solid rgba(255, 255, 255, 0.08)',
	borderRadius: '0px',
	boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 0 30px rgba(255, 255, 255, 0.02)',
	color: '#fff',
});

export const getPixelBoxStyle = (category: keyof typeof EditorColors | 'none' = 'none') => {
	const theme = category !== 'none' ? (EditorColors as any)[category] : { border: 'rgba(255,255,255,0.15)', bg: 'rgba(13, 17, 23, 0.8)', glow: 'rgba(255,255,255,0.05)' };
	return {
		fontFamily: PIXEL_FONT,
		backgroundColor: theme.bg,
		backdropFilter: 'blur(16px)',
		border: `1px solid ${theme.border}55`,
		borderRadius: '0px',
		boxShadow: `inset 0 0 15px ${theme.glow}, 0 10px 30px rgba(0,0,0,0.5)`,
		color: '#ffffff',
		padding: '12px',
		minWidth: '160px',
        position: 'relative' as const,
        overflow: 'hidden' as const,
	};
};

export const getPixelHeaderStyle = (category: keyof typeof EditorColors | 'none' = 'none') => {
	const theme = category !== 'none' ? (EditorColors as any)[category] : { border: '#fff' };
	return {
		fontSize: '10px',
		fontWeight: 'bold' as const,
		color: theme.border,
		marginBottom: '12px',
		display: 'flex',
		alignItems: 'center',
		gap: '8px',
		textShadow: `0 0 10px ${theme.border}66`,
		letterSpacing: '1px',
	};
};

export const getPixelInputStyle = () => ({
	fontFamily: PIXEL_FONT,
	fontSize: '9px',
	backgroundColor: 'rgba(0, 0, 0, 0.4)',
	border: '1px solid rgba(255, 255, 255, 0.08)',
	borderRadius: '0px',
	color: '#ffffff',
	padding: '6px 10px',
	outline: 'none',
	width: '100%',
	boxSizing: 'border-box' as const,
	boxShadow: 'inset 0 4px 10px rgba(0, 0, 0, 0.4)',
});

/**
 * Mantine Theme Overrides for global application
 */
export const getMantineThemeOverrides = () => ({
	fontFamily: PIXEL_FONT,
	primaryColor: 'blue',
	colorScheme: 'dark' as const,
	components: {
		Modal: {
			defaultProps: {
				padding: 'xl',
				centered: true,
				overlayProps: {
					blur: 8,
					opacity: 0.6,
				},
			},
		},
		Button: {
			styles: {
				root: {
					fontFamily: PIXEL_FONT,
					borderRadius: 0,
					textTransform: 'uppercase' as const,
					fontSize: '8px',
					letterSpacing: '1px',
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
				},
			},
		},
		TextInput: {
			styles: {
				input: getPixelInputStyle(),
				label: {
					fontFamily: PIXEL_FONT,
					fontSize: '7px',
					marginBottom: '6px',
					color: 'rgba(255,255,255,0.4)',
				},
			},
		},
		Select: {
			styles: {
				input: getPixelInputStyle(),
				label: {
					fontFamily: PIXEL_FONT,
					fontSize: '7px',
					marginBottom: '6px',
					color: 'rgba(255,255,255,0.4)',
				},
				dropdown: {
					backgroundColor: '#0d1117',
					border: '1px solid rgba(255,255,255,0.1)',
					borderRadius: 0,
				},
				item: {
					fontSize: '9px',
					fontFamily: PIXEL_FONT,
					'&[data-selected]': {
						backgroundColor: 'rgba(0, 210, 255, 0.2)',
					},
				},
			},
		},
	},
});
