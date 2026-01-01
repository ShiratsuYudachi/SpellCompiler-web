// =============================================
// Editor Context
//  - 
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
