import {createSignal, onCleanup} from 'solid-js'
import {preparePuppetDocument} from '@winter-love/puppet/player'
import {unpackTextureAtlas} from '@winter-love/puppet/editor'
import {useWorkspace} from '../workspace/context'

/** Runtime screens borrow the Poffo model and never restore or own another current document. */
export const useRuntimeDocument = () => {
  const workspace = useWorkspace()
  if (workspace === undefined) {
    throw new Error('Runtime requires a Poffo model session')
  }
  const [error, setError] = createSignal<string | null>(null)
  const [pendingFile, setPendingFile] = createSignal<string | null>(null)
  let controller: AbortController | undefined
  const cancel = () => {
    controller?.abort()
    controller = undefined
    setPendingFile(null)
  }
  const loadFile = async (file: File) => {
    controller?.abort()
    const request = new AbortController()
    controller = request
    const initial = workspace.model.read()
    setError(null)
    setPendingFile(file.name)
    try {
      const result = await preparePuppetDocument({
        signal: request.signal,
        source: file,
      })
      if (request.signal.aborted) {
        return
      }
      if (!result.ok) {
        setError('올바른 Poffo 문서를 선택하세요.')
        return
      }
      const document = await unpackTextureAtlas(result.document)
      if (request.signal.aborted) {
        return
      }
      if (workspace.model.read().sessionId !== initial.sessionId) {
        return
      }
      const applied = workspace.replaceDocument(document, initial.revision)
      if (!applied.ok) {
        setError('문서가 변경되었거나 편집 중입니다. 다시 선택하세요.')
      }
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '문서를 불러오지 못했습니다.')
      }
    } finally {
      if (controller === request) {
        controller = undefined
        setPendingFile(null)
      }
    }
  }
  onCleanup(cancel)
  return {
    cancel,
    dismissError: () => setError(null),
    document: workspace.document,
    error,
    loadFile,
    pendingFile,
    sessionId: () => workspace.model.read().sessionId,
  }
}
