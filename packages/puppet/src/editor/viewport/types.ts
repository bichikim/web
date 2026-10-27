import type {JSX} from 'solid-js'
import type {PlayerViewCamera} from '../../player'
import type {PlayerCanvasProps} from '../PlayerCanvas'

export interface ViewportView {
  readonly camera: PlayerViewCamera
  readonly fitted: boolean
}

export interface ViewportProps extends Omit<PlayerCanvasProps, 'renderScale'> {
  /** Host registration key; has no routing meaning inside Puppet. */
  readonly owner: string
  /** Editing overlays; omitted for playback-only views. */
  readonly children?: JSX.Element
  /** Extra camera buttons; omitted for standard controls. */
  readonly viewControls?: JSX.Element
  /** Floating tools; omitted when no tools are needed. */
  readonly controls?: JSX.Element
  /** Explicit framing invalidation; omitted to retain the camera. */
  readonly fitRevision?: unknown
  /** Host camera settings; omitted to retain the shared camera. */
  readonly view?: ViewportView
  /** Reports camera changes for host persistence. */
  readonly onViewChange?: (view: ViewportView) => void
  /** Playback state; omitted when controlled through onPlayerChange. */
  readonly playing?: boolean
  /** Host background; omitted to use the existing editor surface. */
  readonly background?: string
}

export interface ViewportEntry {
  readonly mount: HTMLElement
  readonly props: ViewportProps
}

export interface ViewportHost {
  /** Borrows a host-owned viewport. The release function unregisters without destroying its player. */
  readonly bind: (entry: ViewportEntry) => () => void
}
