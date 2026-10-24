import type {Accessor} from 'solid-js'

import type {PuppetDocument} from '../player'
import {hasTextureAtlas} from './internal/texture-atlas'
import {unpackTextureAtlas} from './internal/texture-atlas-canvas'

/**
 * Cuts a starting document packed into a texture atlas back into part images, since editing
 * tools (auto mesh, PSD reimport) work on each part's own image. Skipped once the document
 * has been edited meanwhile.
 */
export const useInitialAtlasUnpack = (options: {
  readonly document: Accessor<PuppetDocument>
  readonly initialDocument: PuppetDocument
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string | null) => void
}) => {
  if (!hasTextureAtlas(options.initialDocument)) {
    return
  }
  unpackTextureAtlas(options.initialDocument).then(
    (document) => {
      if (options.document() === options.initialDocument) {
        options.onDocumentChange(document)
      }
    },
    () => options.onNotice('텍스처 아틀라스 이미지를 읽지 못했습니다.'),
  )
}
