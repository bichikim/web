import {createContext, untrack, useContext} from 'solid-js'
import {type JSX} from '@solidjs/web'

interface EditorPortalProviderProps {
  readonly children?: JSX.Element
  readonly mount: Element
}

const EditorPortalContext = createContext<Element | null>(null)

export const EditorPortalProvider = (props: EditorPortalProviderProps) => {
  const mount = untrack(() => props.mount)

  return <EditorPortalContext value={mount}>{props.children}</EditorPortalContext>
}

export const useEditorPortalMount = () => useContext(EditorPortalContext) ?? undefined
