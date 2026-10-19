import {type Accessor, createSignal, onCleanup} from 'solid-js'

import {type PuppetDocument, serializeDocument} from '../player'

export const useDocumentExport = (
  document: Accessor<PuppetDocument>,
  hasTemporaryChanges: Accessor<boolean> = () => false,
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
  const exportDocument = () => {
    const source = serializeDocument(document())
    const next = URL.createObjectURL(new Blob([source], {type: 'application/json'}))
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
  return {dismissNotice: () => setOmitsTemporary(false), exportDocument, omitsTemporary, url}
}
