import {type Accessor, createSignal, onCleanup} from 'solid-js'

import {type PuppetDocument, serializeDocument} from '@winter-love/puppet/player'
import {packTextureAtlas} from '@winter-love/puppet/editor'

export const useDocumentExport = (
  document: Accessor<PuppetDocument>,
  hasTemporaryChanges: Accessor<boolean> = () => false,
  onNotice?: (message: string | null) => void,
) => {
  const [url, setUrl] = createSignal<string | null>(null)
  const [omitsTemporary, setOmitsTemporary] = createSignal(false)
  let disposed = false
  const release = () => {
    const previous = url()
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
  }
  onCleanup(() => {
    disposed = true
    release()
  })
  const download = (exported: PuppetDocument, omitted = hasTemporaryChanges()) => {
    if (disposed) {
      return
    }
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
    setOmitsTemporary(omitted)
  }
  const exportDocument = () => download(document())
  /** Exports with every part image packed into shared texture atlas pages. */
  const exportAtlasDocument = async () => {
    if (disposed) {
      return
    }
    const source = document()
    const omitted = hasTemporaryChanges()
    onNotice?.('텍스처 아틀라스를 만드는 중입니다.')
    try {
      const packed = await packTextureAtlas(source)
      if (!disposed) {
        download(packed, omitted)
        onNotice?.(null)
      }
    } catch {
      if (!disposed) {
        onNotice?.('텍스처 아틀라스를 만들지 못했습니다.')
      }
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
