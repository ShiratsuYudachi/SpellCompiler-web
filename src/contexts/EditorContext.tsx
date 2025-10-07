// =============================================
// Editor Context
// 编辑器上下文 - 用于节点间通信
// =============================================

import { createContext, useContext } from 'react';

interface EditorContextType {
	onHandleAddNode?: (nodeId: string, handleId: string, event: React.MouseEvent) => void;
}

const EditorContext = createContext<EditorContextType>({});

export const EditorProvider = EditorContext.Provider;

export function useEditor() {
	return useContext(EditorContext);
}
