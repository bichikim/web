import {createEffect, createSignal, onMount} from 'solid-js'

type EditorWorkspace = 'animation' | 'modeling'
const WORKSPACE_STORAGE_KEY = 'puppet:editor-workspace:v1'

const readWorkspaceFromLocalStorage = () => {
  try {
    const stored = globalThis.localStorage.getItem(WORKSPACE_STORAGE_KEY)
    return stored === 'animation' || stored === 'modeling' ? stored : undefined
  } catch (error) {
    console.warn('Puppet editor workspace could not be read.', error)
    return undefined
  }
}

const writeWorkspaceToLocalStorage = (workspace: EditorWorkspace) => {
  try {
    globalThis.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspace)
  } catch (error) {
    console.warn('Puppet editor workspace could not be saved.', error)
  }
}

export const useEditorWorkspace = (initialWorkspace: EditorWorkspace = 'modeling') => {
  const [workspace, setWorkspace] = createSignal(initialWorkspace)
  onMount(() => {
    setWorkspace(readWorkspaceFromLocalStorage() ?? initialWorkspace)
    createEffect(() => writeWorkspaceToLocalStorage(workspace()))
  })
  return {setWorkspace, workspace}
}
