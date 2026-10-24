import {useWorkspace} from '../workspace/context'
import {createMemo, createResource, createSignal, onCleanup} from 'solid-js'
import {preparePuppetDocument, type PuppetDocument} from '../player'
import {createRuntimeDocumentSession} from './create-runtime-document-session'
import {unpackTextureAtlas} from '../editor/internal/texture-atlas-canvas'

interface UseRuntimeDocumentProps {
  readonly loadInitialDocument: () => Promise<PuppetDocument>
  readonly sessionId: string | null
}

export const useRuntimeDocument = (props: UseRuntimeDocumentProps) => {
  const workspace = useWorkspace()
  const documentKey = `puppet:runtime-document:v1:${props.sessionId ?? 'default'}`
  const [sessionId, setSessionId] = createSignal(props.sessionId)
  const loadInitial = async () => {
    const current = sessionStorage.getItem(documentKey) ?? props.sessionId
    setSessionId(current)
    return current === null
      ? props.loadInitialDocument()
      : createRuntimeDocumentSession(current).read()
  }
  const [source, setSource] = createSignal<File | 'initial'>('initial')
  const [error, setError] = createSignal<string | null>(null)
  let controller: AbortController | undefined
  onCleanup(() => controller?.abort())
  const [document] = createResource(source, async (source) => {
    controller?.abort()
    const request = new AbortController()
    controller = request
    setError(null)
    if (source === 'initial' && workspace !== undefined) {
      return undefined
    }
    try {
      const options =
        source === 'initial'
          ? {
              document: await loadInitial(),
              signal: request.signal,
            }
          : {signal: request.signal, source: await source.text()}
      if ('document' in options && options.document === null) {
        throw new Error('뷰어 문서를 찾을 수 없습니다. 에디터에서 다시 열어주세요.')
      }
      const result = await preparePuppetDocument(options)
      if (request.signal.aborted) {
        return undefined
      }
      if (!result.ok) {
        throw new Error('올바른 Puppet JSON 문서를 선택하세요.')
      }
      if (source !== 'initial' && workspace !== undefined) {
        const editable = await unpackTextureAtlas(result.document)
        if (request.signal.aborted) {
          return undefined
        }
        workspace.replaceDocument(editable)
        return editable
      } else if (source !== 'initial') {
        try {
          const sessionId = crypto.randomUUID()
          await createRuntimeDocumentSession(sessionId).write(result.document)
          if (!request.signal.aborted) {
            sessionStorage.setItem(documentKey, sessionId)
            setSessionId(sessionId)
          }
        } catch {
          if (!request.signal.aborted) {
            setError('모델의 새로고침 복원 정보를 저장하지 못했습니다.')
          }
        }
      }
      return request.signal.aborted ? undefined : result.document
    } catch (cause) {
      if (!request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '문서를 불러오지 못했습니다.')
      }
      return undefined
    }
  })
  return {
    dismissError: () => setError(null),
    document: createMemo(() => workspace?.document() ?? document()),
    error,
    loadFile: (file: File) => setSource(file),
    sessionId,
  }
}
