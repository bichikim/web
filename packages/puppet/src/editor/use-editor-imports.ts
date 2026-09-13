import {type Accessor, createSignal, onCleanup} from 'solid-js'
import {preparePuppetDocument, type PuppetDocument} from '../player'
import {importPng, type ImportPngErrorCode} from './import-png'
import {getPsdErrorMessage, importPsd} from './import-psd'
import {mergeDocument} from './internal/merge-document'
import {usePsdReimport} from './use-psd-reimport'

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
  readonly readPsd?: typeof importPsd
  readonly document: Accessor<PuppetDocument>
  readonly onReimportDocumentChange: (document: PuppetDocument) => void
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice: (message: string | null) => void
}
interface ReadFileSuccess {
  readonly ok: true
  readonly document: PuppetDocument
  readonly notice: string
}
interface ReadFileFailure {
  readonly ok: false
  readonly notice: string
}
const readFile = async (
  file: File,
  signal: AbortSignal,
  readPsd: typeof importPsd = importPsd,
): Promise<ReadFileSuccess | ReadFileFailure> => {
  switch (file.name.split('.').at(-1)?.toLowerCase()) {
    case 'json': {
      const result = await preparePuppetDocument({signal, source: await file.text()})
      return result.ok
        ? {...result, notice: ''}
        : {notice: 'Puppet 문서가 아니거나 JSON 형식이 올바르지 않습니다.', ok: false}
    }
    case 'png': {
      const result = await importPng(file)
      return result.ok
        ? {...result, notice: ''}
        : {notice: getPngErrorMessage(result.error.code), ok: false}
    }
    case 'psd': {
      const result = await readPsd(file)
      return result.ok
        ? {...result, notice: result.warnings.join(' ')}
        : {notice: getPsdErrorMessage(result.error.code), ok: false}
    }
    default:
      return {notice: 'PNG, PSD, JSON 파일을 선택하세요.', ok: false}
  }
}
export const useEditorImports = (options: UseEditorImportsOptions) => {
  const reimport = usePsdReimport({
    document: options.document,
    readPsd: options.readPsd,
    onDocumentChange: options.onReimportDocumentChange,
    onNotice: options.onNotice,
  })
  const [revision, setRevision] = createSignal(0)
  let generation = 0
  let controller: AbortController | undefined
  onCleanup(() => {
    generation += 1
    controller?.abort()
  })
  const load = async (file: File | undefined, mode: 'append' | 'replace') => {
    if (file === undefined) {
      return
    }
    generation += 1
    const current = generation
    controller?.abort()
    controller = new AbortController()
    const original = options.document()
    reimport.cancel()
    options.onNotice(`${file.name}을 읽는 중입니다.`)
    try {
      const result = await readFile(file, controller.signal, options.readPsd)
      if (current !== generation) {
        return
      }
      if (!result.ok) {
        options.onNotice(result.notice)
        return
      }
      if (original !== options.document()) {
        options.onNotice('읽는 동안 문서가 변경되었습니다. 파일을 다시 선택하세요.')
        return
      }
      const next = mode === 'append' ? mergeDocument(original, result.document) : result
      if (!next.ok) {
        options.onNotice('모델의 연결 관계를 유지할 수 없어 추가하지 않았습니다.')
        return
      }
      if (mode === 'append') {
        options.onReimportDocumentChange(next.document)
      } else {
        options.onDocumentChange(next.document)
        setRevision((value) => value + 1)
      }
      options.onNotice(
        `${file.name}: ${mode === 'append' ? '기존 문서에 추가했습니다.' : '문서를 교체했습니다.'} 실행 취소로 복원할 수 있습니다. ${result.notice}`,
      )
    } catch {
      if (current === generation) {
        options.onNotice('파일을 읽지 못했습니다.')
      }
    }
  }
  return {
    handleImport: (file: File | undefined) => load(file, 'append'),
    handleOpen: (file: File | undefined) => load(file, 'replace'),
    reimport: {
      ...reimport,
      load: (file: File | undefined) => {
        if (file === undefined) {
          return Promise.resolve()
        }
        generation += 1
        controller?.abort()
        return reimport.load(file)
      },
    },
    revision,
  }
}
