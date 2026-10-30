import {createSurfaceRegistry} from './create-surface-registry'
import {createMemo, createSignal, type JSX, Show} from 'solid-js'
import {Portal} from 'solid-js/web'
import {WorkspaceContext} from './context'
import {HeaderSurface} from './HeaderSurface'
import {RenderingSettings} from './RenderingSettings'
import {
  type EditorController,
  EditorToast,
  type ModelBinding,
  ViewportContext,
  ViewportSurface,
} from '@winter-love/puppet/editor'
import type {PlayerRenderingInfo} from '@winter-love/puppet/player'
import {useRenderingPreferences} from './use-rendering-preferences'
import type {HeaderProps, ViewportProps, WorkspaceContextValue, WorkspaceMode} from './types'

import {navigateWorkspace} from '../navigate-workspace'
interface WorkspaceProviderProps {
  /** Active screen; editor and runtime controllers remain owned by this provider. */
  readonly mode: WorkspaceMode
  /** Disables retained page input while the Converter is visible; omitted for active input. */
  readonly active?: boolean
  /** Shared host model; navigation reads it without copying or persisting another document. */
  readonly model: ModelBinding
  /** Retained screen controllers and outlet containers. */
  readonly children: JSX.Element
}
export const WorkspaceProvider = (props: WorkspaceProviderProps) => {
  const rendering = useRenderingPreferences()
  const [renderingInfo, setRenderingInfo] = createSignal<PlayerRenderingInfo | null>(null)
  const [editorControl, setEditorControl] = createSignal<EditorController>()
  const document = () => props.model.document()
  let sequence = 0
  const headers = createSurfaceRegistry<HeaderProps>()
  const viewports = createSurfaceRegistry<ViewportProps>()
  const owner = () => (props.mode === 'editor' ? 'editor' : 'runtime')
  const header = createMemo(() => headers.current(owner()))
  const viewport = createMemo(() => viewports.current(owner()))
  const context: WorkspaceContextValue = {
    active: () => props.active !== false,
    bindHeader: headers.bind,
    bindViewport: viewports.bind,
    document,
    mode: () => props.mode,
    get model() {
      return props.model
    },
    openRuntime: async (page) => {
      if (props.model.read().transaction !== null) {
        throw new Error('진행 중인 편집을 마친 후 이동하세요.')
      }
      const result = editorControl()?.lifecycle.deactivate()
      if (result?.status === 'rejected') {
        throw new Error('진행 중인 편집을 마친 후 이동하세요.')
      }
      navigateWorkspace(new URL(`/${page}${location.search}`, location.origin).href)
    },
    renderingInfo,
    renderingPreferences: rendering.preferences,
    replaceDocument: (next, expectedRevision = props.model.read().revision) => {
      sequence += 1
      return props.model.request({
        document: next,
        expectedRevision,
        ownerId: 'poffo-runtime',
        requestId: `runtime:${sequence}`,
        type: 'replace',
      })
    },
    setAntialiasing: rendering.setAntialiasing,
    setEditorControl,
    setRenderer: rendering.setRenderer,
  }
  const fallback = () => viewports.current('editor')?.props
  const active = () => viewport()?.props ?? fallback()
  const editorFit = createMemo(() => viewports.current('editor')?.props.fitRevision)
  const fitRevision = createMemo(() => ({revision: editorFit()}))
  const headerProps = () => header()?.props ?? headers.current('editor')?.props
  // Resource owners live outside Portal's mount effect; only its container changes on navigation.
  const headerContent = (
    <WorkspaceContext.Provider value={context}>
      <Show when={headerProps() !== undefined}>
        <HeaderSurface {...headerProps()!} />
      </Show>
    </WorkspaceContext.Provider>
  )
  const viewportContent = (
    <Show when={document() !== undefined && active() !== undefined}>
      <ViewportSurface
        {...active()!}
        fitRevision={fitRevision()}
        viewSettings={
          <WorkspaceContext.Provider value={context}>
            <RenderingSettings />
          </WorkspaceContext.Provider>
        }
        renderer={rendering.preferences().renderer}
        antialiasing={
          rendering.preferences().antialiasing === 'auto'
            ? 'ssaa'
            : rendering.preferences().antialiasing
        }
        onRenderingChange={setRenderingInfo}
        onRenderingError={rendering.reportError}
      />
    </Show>
  )
  return (
    <WorkspaceContext.Provider value={context}>
      <ViewportContext.Provider value={{bind: viewports.bind}}>
        {props.children}
      </ViewportContext.Provider>
      <EditorToast message={rendering.error() ?? undefined} onDismiss={rendering.dismissError} />
      <Show when={header()?.mount}>
        {(mount) => <Portal mount={mount()}>{headerContent}</Portal>}
      </Show>
      <Show when={viewport()?.mount}>
        {(mount) => <Portal mount={mount()}>{viewportContent}</Portal>}
      </Show>
    </WorkspaceContext.Provider>
  )
}
