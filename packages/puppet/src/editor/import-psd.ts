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
const RGB_MODE = 3
const CHANNEL_BITS = 8
const MAXIMUM_FILE_BYTES = 134_217_728

const readFile = (file: File): Promise<ArrayBuffer | undefined> =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(undefined)
    reader.onload = () => resolve(reader.result instanceof ArrayBuffer ? reader.result : undefined)
    reader.readAsArrayBuffer(file)
  })

export const importPsd = async (file: File): Promise<ImportPsdResult> => {
  if (!/\.psd$/iu.test(file.name)) {
    return {error: {code: 'invalid-file'}, ok: false}
  }
  if (file.size > MAXIMUM_FILE_BYTES) {
    return {error: {code: 'too-large'}, ok: false}
  }
  const bytes = await readFile(file)
  if (bytes === undefined) {
    return {error: {code: 'read-failed'}, ok: false}
  }
  try {
    const [{readPsd}, {createPsdDocument}] = await Promise.all([
      import('ag-psd'),
      import('./internal/psd-document'),
    ])
    // Read dimensions before decompressing layer pixels.
    const psd = readPsd(bytes, {
      skipCompositeImageData: true,
      skipThumbnail: true,
      useRawData: true,
    })
    if (psd.bitsPerChannel !== CHANNEL_BITS || psd.colorMode !== RGB_MODE) {
      return {error: {code: 'unsupported-mode'}, ok: false}
    }
    return createPsdDocument(psd)
  } catch {
    return {error: {code: 'decode-failed'}, ok: false}
  }
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
