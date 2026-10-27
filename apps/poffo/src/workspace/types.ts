import {
  type EditorController,
  type ModelBinding,
  type ModelCommandResult,
  type ViewportProps,
} from '@winter-love/puppet/editor'
import type {Accessor, JSX} from 'solid-js'
import type {
  PlayerAntialiasing,
  PlayerRendererPreference,
  PlayerRenderingInfo,
  PuppetDocument,
} from '@winter-love/puppet/player'
import type {RenderingPreferences} from './use-rendering-preferences'

export type WorkspaceMode = 'editor' | 'studio' | 'viewer'
export type WorkspaceNavigationAction = (signal?: AbortSignal) => void | Promise<void>
export type WorkspaceOwner = 'editor' | 'runtime'
export interface HeaderProps {
  /** Surface owner, used to choose the active retained header. */
  readonly owner: WorkspaceOwner
  /** File and workspace-specific menu. Omitted, no menu. */
  readonly menu?: JSX.Element
  /** Workspace-specific actions. Omitted, no tools. */
  readonly children?: JSX.Element
  /** Workspace switch beside the file menu. Omitted, no navigation. */
  readonly navigation?: JSX.Element
  /** Additional toolbar content, such as editor brush settings. Omitted, no extension. */
  readonly extension?: JSX.Element
}
export type {ViewportProps} from '@winter-love/puppet/editor'
export interface SurfaceEntry<T> {
  /** Outlet container owned by its retained screen. */
  readonly mount: HTMLElement
  /** Reactive surface configuration read by the persistent resource owner. */
  readonly props: T
}
export interface WorkspaceContextValue {
  readonly renderingPreferences: Accessor<RenderingPreferences>
  readonly renderingInfo: Accessor<PlayerRenderingInfo | null>
  readonly setRenderer: (renderer: PlayerRendererPreference) => void
  readonly setAntialiasing: (antialiasing: PlayerAntialiasing) => void
  readonly active: Accessor<boolean>
  readonly mode: Accessor<WorkspaceMode>
  readonly model: ModelBinding
  readonly document: Accessor<PuppetDocument>
  readonly replaceDocument: (
    document: PuppetDocument,
    expectedRevision?: number,
  ) => ModelCommandResult
  readonly openRuntime: (page: 'studio' | 'viewer') => Promise<void>
  readonly setEditorControl: (control: EditorController) => void
  readonly bindHeader: (entry: SurfaceEntry<HeaderProps>) => () => void
  readonly bindViewport: (entry: SurfaceEntry<ViewportProps>) => () => void
}
