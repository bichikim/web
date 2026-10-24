import type {PuppetDocument} from '../player/document'

export type ImportPsdErrorCode =
  | 'invalid-file'
  | 'read-failed'
  | 'decode-failed'
  | 'unsupported-mode'
  | 'too-large'
  | 'empty-document'
export interface ImportPsdSuccess {
  readonly ok: true
  readonly document: PuppetDocument
  readonly warnings: ReadonlyArray<string>
}
export interface ImportPsdFailure {
  readonly ok: false
  readonly error: {readonly code: ImportPsdErrorCode}
}
export type ImportPsdResult = ImportPsdSuccess | ImportPsdFailure
const MAXIMUM_FILE_BYTES = 268_435_456

/** Reads a PSD, terminating background processing when the optional signal aborts. */
export const importPsd = async (file: File, signal?: AbortSignal): Promise<ImportPsdResult> => {
  signal?.throwIfAborted()
  if (!/\.psd$/iu.test(file.name)) {
    return {error: {code: 'invalid-file'}, ok: false}
  }
  if (file.size > MAXIMUM_FILE_BYTES) {
    return {error: {code: 'too-large'}, ok: false}
  }
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    const {readPsdDocument} = await import('./internal/read-psd-document')
    signal?.throwIfAborted()
    const result = await readPsdDocument(file)
    signal?.throwIfAborted()
    return result
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./internal/import-psd-worker.ts', import.meta.url), {
      type: 'module',
    })
    const dispose = () => {
      signal?.removeEventListener('abort', handleAbort)
      worker.terminate()
    }
    const handleAbort = () => {
      dispose()
      reject(signal?.reason)
    }
    worker.addEventListener(
      'message',
      (event: MessageEvent<ImportPsdResult>) => {
        dispose()
        resolve(event.data)
      },
      {once: true},
    )
    const handleError = () => {
      dispose()
      resolve({error: {code: 'decode-failed'}, ok: false})
    }
    worker.addEventListener('error', handleError, {once: true})
    worker.addEventListener('messageerror', handleError, {once: true})
    signal?.addEventListener('abort', handleAbort, {once: true})
    try {
      worker.postMessage(file)
    } catch (cause) {
      dispose()
      reject(cause)
    }
  })
}

export const getPsdErrorMessage = (code: ImportPsdErrorCode): string => {
  switch (code) {
    case 'invalid-file':
      return 'PSD 파일을 선택하세요.'
    case 'read-failed':
      return 'PSD 파일을 읽지 못했습니다.'
    case 'decode-failed':
      return 'PSD를 해석하지 못했습니다. 파일이 손상되었거나 지원하지 않는 형식입니다.'
    case 'unsupported-mode':
      return 'Photoshop에서 RGB 색상 · 8비트 PSD로 저장한 뒤 다시 불러오세요.'
    case 'too-large':
      return 'PSD가 가져오기 크기 제한을 초과했습니다. 캔버스나 레이어 크기를 줄여주세요.'
    case 'empty-document':
      return '가져올 이미지 레이어가 없습니다.'
  }
}
