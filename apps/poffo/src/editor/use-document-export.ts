import {isTauri} from '@tauri-apps/api/core'
import {writeDocumentFile} from '../desktop/write-document-file'
import {type Accessor, createSignal, onCleanup} from 'solid-js'

import {
  type PuppetDocument,
  serializeDocumentChunks,
  serializePoffoDocument,
} from '@winter-love/puppet/player'
import {packTextureAtlas} from '@winter-love/puppet/editor'

const releaseDownloadUrl = (url: string | null) => {
  if (url !== null) {
    URL.revokeObjectURL(url)
  }
}

const downloadInBrowser = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = globalThis.document.createElement('a')
  anchor.download = name
  anchor.href = url
  globalThis.document.body.append(anchor)
  anchor.click()
  anchor.remove()
  return url
}

export const useDocumentExport = (
  document: Accessor<PuppetDocument>,
  hasTemporaryChanges: Accessor<boolean> = () => false,
  onDocumentSaved?: (document: PuppetDocument) => void | Promise<void>,
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
  onCleanup(() => {
    disposed = true
    cancelExport()
    releaseDownloadUrl(downloadUrl)
  })
  const downloadBlob = async (
    blob: Blob,
    name: string,
    omitted: boolean,
    exported: PuppetDocument,
  ) => {
    if (disposed) {
      return
    }
    if (isTauri()) {
      const version = exportVersion
      setPending(name)
      try {
        const saved = await writeDocumentFile({content: blob, name, signal: activeExport?.signal})
        if (saved && !disposed && version === exportVersion) {
          setOmitsTemporary(omitted)
          try {
            await onDocumentSaved?.(exported)
          } catch {
            setNotice('파일은 저장했지만 세션의 저장 상태를 갱신하지 못했습니다.')
          }
        }
      } finally {
        if (!disposed && version === exportVersion) {
          setPending(null)
        }
      }
      return
    }
    releaseDownloadUrl(downloadUrl)
    downloadUrl = downloadInBrowser(blob, name)
    setOmitsTemporary(omitted)
  }
  const download = (exported: PuppetDocument, omitted = hasTemporaryChanges()) => {
    return downloadBlob(
      new Blob([...serializeDocumentChunks(exported)], {type: 'application/json'}),
      'puppet-model.json',
      omitted,
      exported,
    )
  }
  const exportDocument = () => {
    if (disposed) {
      return
    }
    cancelExport()
    setNotice(null)
    const controller = new AbortController()
    activeExport = controller
    download(document()).catch(() => {
      if (!disposed && !controller.signal.aborted) {
        setNotice('문서를 저장하지 못했습니다.')
      }
    })
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
      const exported = document()
      const blob = await serializePoffoDocument(exported, {
        signal: controller.signal,
      })
      if (!disposed && !controller.signal.aborted) {
        await downloadBlob(blob, 'puppet-model.poffo', omitted, exported)
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
      if (!disposed && (!isTauri() || version === exportVersion)) {
        await download(packed, omitted)
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
