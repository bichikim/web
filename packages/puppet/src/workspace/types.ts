import type {Accessor, JSX} from 'solid-js'
import type {PuppetDocument} from '../player'
import type {PlayerCanvasProps} from '../editor/PlayerCanvas'
import type {RuntimeView} from '../tracking/types'

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
export interface ViewportProps extends PlayerCanvasProps {
  /** Surface owner, used to choose the active retained viewport. */
  readonly owner: WorkspaceOwner
  /** Editing geometry, available only for the active editor. Omitted, model only. */
  readonly children?: JSX.Element
  /** Additional view buttons. Omitted, standard view controls. */
  readonly viewControls?: JSX.Element
  /** Floating editing controls. Omitted, none. */
  readonly controls?: JSX.Element
  /** Explicit document-import fit revision. Omitted, retain the current camera. */
  readonly fitRevision?: unknown
  /** Runtime profile camera. Omitted, retain the shared camera. */
  readonly view?: RuntimeView
  /** Reports navigation and fit changes for runtime profile storage. */
  readonly onViewChange?: (view: RuntimeView) => void
  /** Playback state. Omitted, the consumer manages playback through onPlayerChange. */
  readonly playing?: boolean
  /** Canvas background. Omitted, the existing editor surface color. */
  readonly background?: string
}
export interface SurfaceEntry<T> {
  /** Outlet container owned by its retained screen. */
  readonly mount: HTMLElement
  /** Reactive surface configuration read by the persistent resource owner. */
  readonly props: T
}
export interface WorkspaceContextValue {
  /** Active screen, including Studio and Viewer as distinct runtime modes. */
  readonly mode: Accessor<WorkspaceMode>
  /** Latest parsed editor document. Undefined until initial loading completes. */
  readonly document: Accessor<PuppetDocument | undefined>
  /** External model replacement for the retained editor. Undefined before any runtime import. */
  readonly replacement: Accessor<PuppetDocument | undefined>
  /** Publishes the editor snapshot without replacing its history. */
  readonly publishDocument: (document: PuppetDocument) => void
  /** Replaces the shared model and notifies the editor as one import operation. */
  readonly replaceDocument: (document: PuppetDocument) => void
  /** Persists a changed document before navigation; an aborted signal retains the screen. Rejects on storage failure. */
  readonly openRuntime: (
    page: 'studio' | 'viewer',
    document: PuppetDocument,
    motionId?: string,
    signal?: AbortSignal,
  ) => Promise<void>
  /** Registers a header outlet; the returned command releases that registration. */
  readonly bindHeader: (entry: SurfaceEntry<HeaderProps>) => () => void
  /** Registers a viewport outlet; the returned command releases that registration. */
  readonly bindViewport: (entry: SurfaceEntry<ViewportProps>) => () => void
}
