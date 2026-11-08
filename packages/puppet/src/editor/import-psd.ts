import {validatePsdSource} from '../converter/psd/validate-psd-source'
import type {ImportPsdErrorCode, ImportPsdResult} from '../converter/psd/types'
export type {
  ImportPsdErrorCode,
  ImportPsdResult,
  ImportPsdFailure,
  ImportPsdSuccess,
} from '../converter/psd/types'

/** Reads a PSD, terminating background processing when the optional signal aborts. */
export const importPsd = async (file: File, signal?: AbortSignal): Promise<ImportPsdResult> => {
  signal?.throwIfAborted()
  const failure = validatePsdSource(file)
  if (failure !== undefined) {
    return failure
  }
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
    const {readPsdDocument} = await import('./internal/read-psd-document')
    signal?.throwIfAborted()
    const result = await readPsdDocument(file, signal)
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
