import {useBufferingPreferences} from './use-buffering-preferences'
import {createSurfaceRegistry} from './create-surface-registry'
import {createEffect, createMemo, createSignal, Show} from 'solid-js'
import {type JSX, Portal} from '@solidjs/web'

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
import type {PlayerBufferingInfo, PlayerRenderingInfo} from '@winter-love/puppet/player'
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
  const buffering = useBufferingPreferences()
  const [bufferingInfo, setBufferingInfo] = createSignal<PlayerBufferingInfo | null>(null)
  const dismissSettingsError = () => {
    rendering.dismissError()
    buffering.dismissError()
  }
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
    bufferingEnabled: buffering.enabled,
    bufferingInfo,
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
      return navigateWorkspace(new URL(`/${page}${location.search}`, location.origin).href)
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
    setBufferingEnabled: buffering.setEnabled,
    setEditorControl,
    setRenderer: rendering.setRenderer,
  }
  const fallback = () => viewports.current('editor')?.props
  const active = () => viewport()?.props ?? fallback()
  const editorFit = createMemo(() => viewports.current('editor')?.props.fitRevision)
  const fitRevision = createMemo(() => ({revision: editorFit()}))
  const headerProps = () => header()?.props ?? headers.current('editor')?.props
  // Move the mounted header intact when the active outlet changes.
  const headerMount = (<div class="contents" />) as HTMLDivElement
  createEffect(
    () => header()?.mount ?? headers.current('editor')?.mount,
    (mount) => mount?.append(headerMount),
  )
  const headerContent = (
    <WorkspaceContext value={context}>
      <Show when={headerProps() !== undefined}>
        <HeaderSurface {...headerProps()!} />
      </Show>
    </WorkspaceContext>
  )
  const viewportContent = (
    <Show when={document() !== undefined && active() !== undefined}>
      <ViewportSurface
        {...active()!}
        fitRevision={fitRevision()}
        viewSettings={
          <WorkspaceContext value={context}>
            <RenderingSettings />
          </WorkspaceContext>
        }
        buffering={props.mode === 'viewer' && props.active !== false && buffering.enabled()}
        onBufferingChange={setBufferingInfo}
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
    <WorkspaceContext value={context}>
      <ViewportContext value={{bind: viewports.bind}}>{props.children}</ViewportContext>
      <EditorToast
        tone="error"
        message={rendering.error() ?? buffering.error() ?? undefined}
        onDismiss={dismissSettingsError}
      />
      <Portal mount={headerMount}>{headerContent}</Portal>
      <Show when={viewport()?.mount ?? viewports.current('editor')?.mount}>
        {(mount) => <Portal mount={mount()}>{viewportContent}</Portal>}
      </Show>
    </WorkspaceContext>
  )
}
