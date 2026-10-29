import {type Accessor, createSignal, onCleanup} from 'solid-js'

import {
  type PuppetDocument,
  serializeDocumentChunks,
  serializePoffoDocument,
} from '@winter-love/puppet/player'
import {packTextureAtlas} from '@winter-love/puppet/editor'

export const useDocumentExport = (
  document: Accessor<PuppetDocument>,
  hasTemporaryChanges: Accessor<boolean> = () => false,
) => {
  let downloadUrl: string | null = null
  const [notice, setNotice] = createSignal<string | null>(null)
  const [omitsTemporary, setOmitsTemporary] = createSignal(false)
  const [pending, setPending] = createSignal<string | null>(null)
  let exportVersion = 0
  let activeExport: AbortController | undefined
  const cancelExport = () => {
    exportVersion += 1
    activeExport?.abort()
    activeExport = undefined
    setPending(null)
  }
  let disposed = false
  const release = () => {
    const previous = downloadUrl
    if (previous !== null) {
      URL.revokeObjectURL(previous)
    }
  }
  onCleanup(() => {
    disposed = true
    cancelExport()
    release()
  })
  const downloadBlob = (blob: Blob, name: string, omitted: boolean) => {
    if (disposed) {
      return
    }
    const next = URL.createObjectURL(blob)
    release()
    downloadUrl = next
    const anchor = globalThis.document.createElement('a')
    anchor.download = name
    anchor.href = next
    globalThis.document.body.append(anchor)
    anchor.click()
    anchor.remove()
    setOmitsTemporary(omitted)
  }
  const download = (exported: PuppetDocument, omitted = hasTemporaryChanges()) => {
    downloadBlob(
      new Blob([...serializeDocumentChunks(exported)], {type: 'application/json'}),
      'puppet-model.json',
      omitted,
    )
  }
  const exportDocument = () => {
    if (disposed) {
      return
    }
    cancelExport()
    setNotice(null)
    download(document())
  }
  const exportPoffoDocument = async () => {
    if (disposed) {
      return
    }
    cancelExport()
    const controller = new AbortController()
    activeExport = controller
    const omitted = hasTemporaryChanges()
    setPending('puppet-model.poffo')
    try {
      setNotice(null)
      const blob = await serializePoffoDocument(document(), {
        signal: controller.signal,
      })
      if (!disposed && !controller.signal.aborted) {
        downloadBlob(blob, 'puppet-model.poffo', omitted)
      }
    } catch (cause) {
      if (!disposed && !controller.signal.aborted) {
        console.warn('Poffo document export failed.', cause)
        setNotice('문서를 저장하지 못했습니다.')
      }
    } finally {
      if (activeExport === controller) {
        activeExport = undefined
        setPending(null)
      }
    }
  }
  /** Exports with every part image packed into shared texture atlas pages. */
  const exportAtlasDocument = async () => {
    if (disposed) {
      return
    }
    cancelExport()
    const version = exportVersion
    const source = document()
    const omitted = hasTemporaryChanges()
    setNotice('텍스처 아틀라스를 만드는 중입니다.')
    try {
      const packed = await packTextureAtlas(source)
      if (!disposed) {
        download(packed, omitted)
        if (version === exportVersion) {
          setNotice(null)
        }
      }
    } catch {
      if (!disposed && version === exportVersion) {
        setNotice('텍스처 아틀라스를 만들지 못했습니다.')
      }
    }
  }
  return {
    cancelExport,
    dismissNotice: () => {
      setNotice(null)
      setOmitsTemporary(false)
    },
    exportAtlasDocument,
    exportDocument,
    exportPoffoDocument,
    notice,
    omitsTemporary,
    pending,
  }
}
