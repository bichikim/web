import {createResource, createSignal, onCleanup} from 'solid-js'
import {preparePuppetDocument, type PuppetDocument} from '../player'
import {createRuntimeDocumentSession} from './create-runtime-document-session'

interface UseRuntimeDocumentProps {
  readonly loadInitialDocument: () => Promise<PuppetDocument>
  readonly sessionId: string | null
}

export const useRuntimeDocument = (props: UseRuntimeDocumentProps) => {
  const documentKey = `puppet:runtime-document:v1:${props.sessionId ?? 'default'}`
  const loadInitial = async () => {
    const sessionId = sessionStorage.getItem(documentKey) ?? props.sessionId
    return sessionId === null
      ? props.loadInitialDocument()
      : createRuntimeDocumentSession(sessionId).read()
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
      if (source !== 'initial') {
        try {
          const sessionId = crypto.randomUUID()
          await createRuntimeDocumentSession(sessionId).write(result.document)
          if (!request.signal.aborted) {
            sessionStorage.setItem(documentKey, sessionId)
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
    document,
    error,
    loadFile: (file: File) => setSource(file),
  }
}
