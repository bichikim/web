import {createSignal, onCleanup} from 'solid-js'
import {preparePuppetDocument, type PuppetDocument} from '../player'
import {importPng, type ImportPngErrorCode} from './import-png'
import {importPsd, getPsdErrorMessage} from './import-psd'
interface ImportDocumentOptions {
  readonly file?: File
  readonly onFailure: (message: string) => void
  readonly onSuccess: (document: PuppetDocument) => void
  readonly signal: AbortSignal
}
const importDocument = async (options: ImportDocumentOptions) => {
  if (options.file === undefined) {
    return
  }
  const result = await preparePuppetDocument({
    signal: options.signal,
    source: await options.file.text(),
  })
  if (!result.ok) {
    options.onFailure('Puppet 문서가 아니거나 JSON 형식이 올바르지 않습니다.')
    return
  }
  options.onSuccess(result.document)
}
const getPngErrorMessage = (code: ImportPngErrorCode) => {
  switch (code) {
    case 'decode-failed':
      return 'PNG 이미지를 해석하지 못했습니다.'
    case 'invalid-file':
      return 'PNG 파일만 불러올 수 있습니다.'
    case 'no-opaque-pixels':
      return '불투명한 픽셀이 없어 메시를 만들 수 없습니다.'
    case 'read-failed':
      return 'PNG 파일을 읽지 못했습니다.'
    case 'render-failed':
      return 'PNG 픽셀을 분석할 캔버스를 만들지 못했습니다.'
    case 'too-large':
      return '이미지가 너무 큽니다. 1,677만 픽셀 이하 PNG를 사용하세요.'
    case 'invalid-alpha-threshold':
    case 'invalid-cell-size':
    case 'invalid-pixel-data':
      return 'PNG 메시 생성 설정이 올바르지 않습니다.'
    default: {
      const exhaustiveCode: never = code
      return exhaustiveCode
    }
  }
}
interface UseEditorImportsOptions {
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string | null) => void
}

export const useEditorImports = (options: UseEditorImportsOptions) => {
  const [revision, setRevision] = createSignal(0)
  let importGeneration = 0
  let importAbortController: AbortController | undefined

  onCleanup(() => {
    importGeneration += 1
    importAbortController?.abort()
  })
  const handleImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    importAbortController?.abort()
    const activeGeneration = importGeneration
    const abortController = new AbortController()
    importAbortController = abortController
    importDocument({
      file,
      onFailure(message) {
        if (activeGeneration === importGeneration) {
          options.onNotice(message)
        }
      },
      onSuccess(document) {
        if (activeGeneration === importGeneration) {
          options.onDocumentChange(document)
          setRevision((value) => value + 1)
          options.onNotice(null)
        }
      },
      signal: abortController.signal,
    }).catch(() => {
      if (activeGeneration === importGeneration) {
        options.onNotice('파일을 읽지 못했습니다.')
      }
    })
  }
  const handlePngImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }

    importGeneration += 1
    importAbortController?.abort()
    const activeGeneration = importGeneration
    importPng(file)
      .then((result) => {
        if (activeGeneration !== importGeneration) {
          return
        }

        if (!result.ok) {
          options.onNotice(getPngErrorMessage(result.error.code))
          return
        }

        options.onDocumentChange(result.document)
        setRevision((value) => value + 1)
        options.onNotice(`${file.name}에서 알파 기반 메시를 생성했습니다.`)
      })
      .catch(() => {
        if (activeGeneration === importGeneration) {
          options.onNotice('PNG를 불러오는 중 예상하지 못한 오류가 발생했습니다.')
        }
      })
  }

  const handlePsdImport = (file: File | undefined) => {
    if (file === undefined) {
      return
    }
    importGeneration += 1
    importAbortController?.abort()
    const activeGeneration = importGeneration
    options.onNotice(`${file.name}의 레이어를 불러오는 중입니다.`)
    importPsd(file)
      .then((result) => {
        if (activeGeneration !== importGeneration) {
          return
        }
        if (!result.ok) {
          options.onNotice(getPsdErrorMessage(result.error.code))
          return
        }
        options.onDocumentChange(result.document)
        setRevision((value) => value + 1)
        options.onNotice(
          `${file.name}: ${result.document.parts.length}개 파츠를 불러왔습니다. ${result.warnings.join(' ')}`,
        )
      })
      .catch(() => {
        if (activeGeneration === importGeneration) {
          options.onNotice('PSD를 불러오는 중 오류가 발생했습니다.')
        }
      })
  }
  return {handleImport, handlePngImport, handlePsdImport, revision}
}
