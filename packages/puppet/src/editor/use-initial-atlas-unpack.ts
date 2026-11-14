import {type Accessor, onCleanup} from 'solid-js'
import type {PuppetDocument} from '../player'
import {hasTextureAtlas} from './internal/texture-atlas'
import {unpackTextureAtlas} from './internal/texture-atlas-canvas'

export interface UseInitialAtlasUnpackProps {
  /** Current host document; changed identity invalidates the prepared result. */
  readonly document: Accessor<PuppetDocument>
  /** Initial validated input; documents without atlas regions require no preparation. */
  readonly initialDocument: PuppetDocument
  /** Host revision; omitted for unversioned callers. Detects edits followed by undo to the same reference. */
  readonly revision?: Accessor<number>
  /** Submits prepared part images as the existing separate undoable replacement. */
  readonly onDocumentChange: (document: PuppetDocument) => void
  /** Reports image-preparation failure while retaining the original document. */
  readonly onNotice: (message: string | null) => void
}

/** Prepares editable part images and ignores results invalidated by edits or owner disposal. */
export const useInitialAtlasUnpack = (props: UseInitialAtlasUnpackProps): void => {
  if (!hasTextureAtlas(props.initialDocument)) {
    return
  }
  let disposed = false
  const revision = props.revision?.()
  onCleanup(() => {
    disposed = true
  })
  const current = () =>
    !disposed && props.document() === props.initialDocument && props.revision?.() === revision
  unpackTextureAtlas(props.initialDocument).then(
    (document) => {
      if (current()) {
        props.onDocumentChange(document)
      }
    },
    () => {
      if (current()) {
        props.onNotice('텍스처 아틀라스 이미지를 읽지 못했습니다.')
      }
    },
  )
}
