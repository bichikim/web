import {createContext, type JSX, untrack, useContext} from 'solid-js'

interface EditorPortalProviderProps {
  readonly children?: JSX.Element
  readonly mount: Node
}

const EditorPortalContext = createContext<Node>()

export const EditorPortalProvider = (props: EditorPortalProviderProps) => {
  const mount = untrack(() => props.mount)

  return <EditorPortalContext.Provider value={mount}>{props.children}</EditorPortalContext.Provider>
}

export const useEditorPortalMount = () => useContext(EditorPortalContext)
