// =============================================
// Editor keyboard shortcuts: copy, paste, delete, undo, redo
// =============================================

import { useEffect, useRef } from 'react';

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

/** Use refs so the handler always calls the latest callbacks - fixes Cmd+Z/Cmd+Shift+Z only working once due to stale closures. */
function useEditorShortcut({
	onCopy,
	onPaste,
	onDelete,
	onUndo,
	onRedo,
}: UseEditorShortcutOptions): void {
	const onCopyRef = useRef(onCopy);
	const onPasteRef = useRef(onPaste);
	const onDeleteRef = useRef(onDelete);
	const onUndoRef = useRef(onUndo);
	const onRedoRef = useRef(onRedo);
	onCopyRef.current = onCopy;
	onPasteRef.current = onPaste;
	onDeleteRef.current = onDelete;
	onUndoRef.current = onUndo;
	onRedoRef.current = onRedo;

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const el = event.target as HTMLElement | null;
			// Use optional chaining - document has no closest(), would cause early return
			const isSpellNameInput = el?.closest?.('[data-spell-name-input]');
			const skipUndoRedo = !!isSpellNameInput;

			const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
			const modifier = isMac ? event.metaKey : event.ctrlKey;

			// Undo: Cmd/Ctrl+Z (no Shift)
			const isUndo = modifier && !event.shiftKey && (event.code === 'KeyZ' || event.key === 'z');
			// Redo: Cmd/Ctrl+Shift+Z, Cmd/Ctrl+Y, or browser "Redo" key
			const isRedo =
				(modifier && event.shiftKey && (event.code === 'KeyZ' || event.key === 'z' || event.key === 'Z')) ||
				(modifier && (event.code === 'KeyY' || event.key === 'y' || event.key === 'Y')) ||
				event.key === 'Redo';

			if (isUndo) {
				if (!skipUndoRedo) {
					event.preventDefault();
					event.stopImmediatePropagation();
					onUndoRef.current?.();
				}
				return;
			}
			if (isRedo) {
				if (!skipUndoRedo) {
					event.preventDefault();
					event.stopImmediatePropagation();
					onRedoRef.current?.();
				}
				return;
			}

			const isTyping = isTypingTarget(event);
			if (isTyping) return;

			if (modifier && event.key === 'c') {
				event.preventDefault();
				onCopyRef.current?.();
				return;
			}
			if (modifier && event.key === 'v') {
				event.preventDefault();
				onPasteRef.current?.();
				return;
			}
			if (event.key === 'Delete' || event.key === 'Backspace') {
				event.preventDefault();
				onDeleteRef.current?.();
			}
		};

		window.addEventListener('keydown', handleKeyDown, true);
		return () => window.removeEventListener('keydown', handleKeyDown, true);
	}, []); // Empty deps - handler reads latest from refs; editorContainerRef.current is read at runtime
}

export { useEditorShortcut };
