import {type Accessor, createSignal, onCleanup} from 'solid-js'

import {type PuppetDocument, serializeDocument} from '../player'
import {packTextureAtlas} from './internal/texture-atlas-canvas'

export const useDocumentExport = (
  document: Accessor<PuppetDocument>,
  hasTemporaryChanges: Accessor<boolean> = () => false,
  onNotice?: (message: string | null) => void,
) => {
  const [url, setUrl] = createSignal<string | null>(null)
  const [omitsTemporary, setOmitsTemporary] = createSignal(false)
  const release = () => {
    const previous = url()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
  }
  onCleanup(release)
  const download = (exported: PuppetDocument) => {
    const next = URL.createObjectURL(
      new Blob([serializeDocument(exported)], {type: 'application/json'}),
    )
    release()
    setUrl(next)
    const anchor = globalThis.document.createElement('a')
    anchor.download = 'puppet-model.json'
    anchor.href = next
    globalThis.document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setOmitsTemporary(hasTemporaryChanges())
  }
  const exportDocument = () => download(document())
  /** Exports with every part image packed into shared texture atlas pages. */
  const exportAtlasDocument = async () => {
    const source = document()
    onNotice?.('텍스처 아틀라스를 만드는 중입니다.')
    try {
      const packed = await packTextureAtlas(source)
      download(packed)
      onNotice?.(null)
    } catch {
      onNotice?.('텍스처 아틀라스를 만들지 못했습니다.')
    }
  }
  return {
    dismissNotice: () => setOmitsTemporary(false),
    exportAtlasDocument,
    exportDocument,
    omitsTemporary,
    url,
  }
}
