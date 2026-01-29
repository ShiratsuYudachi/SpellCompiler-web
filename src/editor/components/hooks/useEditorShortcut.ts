// =============================================
// Editor keyboard shortcuts: copy, paste, delete, undo, redo
// =============================================

import { useEffect } from 'react';

export interface UseEditorShortcutOptions {
	onCopy?: () => void;
	onPaste?: () => void;
	onDelete?: () => void;
	onUndo?: () => void;
	onRedo?: () => void;
}

/** Skip shortcut when the keydown target is an input, textarea, or inside contentEditable (so we don't steal Cmd+C in text fields). */
function isTypingTarget(event: KeyboardEvent): boolean {
	const el = event.target as HTMLElement | null;
	if (!el || !el.closest) return false;
	if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
	if (el.closest('[contenteditable="true"]')) return true;
	return false;
}

function useEditorShortcut({
	onCopy,
	onPaste,
	onDelete,
	onUndo,
	onRedo,
}: UseEditorShortcutOptions): void {
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (isTypingTarget(event)) return;

			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modifier = isMac ? event.metaKey : event.ctrlKey;

			// Copy: Cmd+C / Ctrl+C
			if (modifier && event.key === 'c') {
				event.preventDefault();
				onCopy?.();
				return;
			}

			// Paste: Cmd+V / Ctrl+V
			if (modifier && event.key === 'v') {
				event.preventDefault();
				onPaste?.();
				return;
			}

			// Undo: Cmd+Z / Ctrl+Z
			if (modifier && event.key === 'z' && !event.shiftKey) {
				event.preventDefault();
				onUndo?.();
				return;
			}

			// Redo: Cmd+Shift+Z / Ctrl+Shift+Z or Cmd+Y / Ctrl+Y
			if (
				(modifier && event.key === 'z' && event.shiftKey) ||
				(modifier && event.key === 'y')
			) {
				event.preventDefault();
				onRedo?.();
				return;
			}

			// Delete / Backspace
			if (event.key === 'Delete' || event.key === 'Backspace') {
				event.preventDefault();
				onDelete?.();
			}
		};

		// Use capture phase so we handle shortcuts before React Flow or other handlers
		window.addEventListener('keydown', handleKeyDown, true);
		return () => window.removeEventListener('keydown', handleKeyDown, true);
	}, [onCopy, onPaste, onDelete, onUndo, onRedo]);
}

export { useEditorShortcut };
