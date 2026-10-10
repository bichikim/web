import type {Accessor} from 'solid-js'
import type {CodeSelection} from '../types'

export interface ScrollPosition {
  readonly top: number
  readonly left: number
}
export interface FitCamera {
  readonly mode: 'fit'
}
export interface ZoomCamera {
  readonly mode: 'zoom'
  readonly scale: number
  readonly x: number
  readonly y: number
}
export type ImageCamera = FitCamera | ZoomCamera
export interface PdfViewState {
  readonly page: number
  readonly fitting: boolean
  readonly percent: number
}
export interface FileViewState {
  readonly selection?: CodeSelection
  readonly codeScroll?: ScrollPosition
  readonly previewScroll?: ScrollPosition
  readonly original?: boolean
  readonly image?: ImageCamera
  readonly pdf?: PdfViewState
}
export interface ViewRequest {
  readonly restore: boolean
  readonly version: number
}
export interface FileViewBinding {
  readonly read: () => FileViewState | undefined
  readonly update: (patch: Partial<FileViewState>) => void
  readonly request: Accessor<ViewRequest>
}
export interface ViewStateContextValue {
  readonly bind: () => FileViewBinding | undefined
}
