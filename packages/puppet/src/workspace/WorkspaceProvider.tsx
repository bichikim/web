import {createSurfaceRegistry} from './create-surface-registry'
import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {WorkspaceContext} from './context'
import {HeaderSurface} from './HeaderSurface'
import {ViewportSurface} from './ViewportSurface'
import type {HeaderProps, ViewportProps, WorkspaceContextValue, WorkspaceMode} from './types'
import type {PuppetDocument} from '../player'
interface WorkspaceProviderProps {
  /** Active screen; editor and runtime controllers remain owned by this provider. */
  readonly mode: WorkspaceMode
  /** Opens a runtime route after recording the in-memory document. */
  readonly onRuntimeOpen: WorkspaceContextValue['openRuntime']
  /** Retained screen controllers and outlet containers. */
  readonly children: JSX.Element
}
export const WorkspaceProvider = (props: WorkspaceProviderProps) => {
  const [document, setDocument] = createSignal<PuppetDocument>()
  const [replacement, setReplacement] = createSignal<PuppetDocument>()
  const headers = createSurfaceRegistry<HeaderProps>()
  const viewports = createSurfaceRegistry<ViewportProps>()
  const owner = () => (props.mode === 'editor' ? 'editor' : 'runtime')
  const header = createMemo(() => headers.current(owner()))
  const viewport = createMemo(() => viewports.current(owner()))
  const context: WorkspaceContextValue = {
    bindHeader: headers.bind,
    bindViewport: viewports.bind,
    document,
    mode: () => props.mode,
    openRuntime: async (page, next, motionId, signal) => {
      setDocument(next)
      await props.onRuntimeOpen(page, next, motionId, signal)
    },
    publishDocument: setDocument,
    replaceDocument: (next) => {
      setDocument(next)
      setReplacement(next)
    },
    replacement,
  }
  const fallback = () => viewports.current('editor')?.props
  const active = () => viewport()?.props ?? fallback()
  const editorFit = createMemo(() => viewports.current('editor')?.props.fitRevision)
  const fitRevision = createMemo(() => ({document: replacement(), revision: editorFit()}))
  const headerProps = () => header()?.props ?? headers.current('editor')?.props
  // Resource owners live outside Portal's mount effect; only its container changes on navigation.
  const headerContent = (
    <Show when={headerProps() !== undefined}>
      <HeaderSurface {...headerProps()!} />
    </Show>
  )
  const viewportContent = (
    <Show when={document() !== undefined && active() !== undefined}>
      <ViewportSurface {...active()!} fitRevision={fitRevision()} />
    </Show>
  )
  return (
    <WorkspaceContext.Provider value={context}>
      {props.children}
      <Show when={header()?.mount}>
        {(mount) => <Portal mount={mount()}>{headerContent}</Portal>}
      </Show>
      <Show when={viewport()?.mount}>
        {(mount) => <Portal mount={mount()}>{viewportContent}</Portal>}
      </Show>
    </WorkspaceContext.Provider>
  )
}
