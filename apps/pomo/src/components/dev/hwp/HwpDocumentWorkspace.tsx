import initWasm, {HwpDocument} from '@rhwp/core'
import wasmUrl from '@rhwp/core/rhwp_bg.wasm?url'
import {createStudio, type RhwpEditor} from '@rhwp/editor'
import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'
import {createExpenseFieldValues, type ExpenseForm} from './expense'
import {HwpExpenseAssistant} from './HwpExpenseAssistant'
import {type ViewerMode} from './document/viewer-mode'
import {HwpDocumentPanel} from './document/Panel'

const HWP_EXTENSION = '.hwp'

const HWPX_EXTENSION = '.hwpx'

const EXAMPLE_FILE_NAME = 'expense-form-template.hwp'

const EXAMPLE_FILE_PATH = `/${EXAMPLE_FILE_NAME}`

interface FieldRecord {
  readonly name: string
}

const isFieldRecord = (value: unknown): value is FieldRecord =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  'name' in value &&
  typeof value.name === 'string'

const readFieldNames = (document: HwpDocument) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(document.getFieldList())
  } catch (error) {
    throw new Error('HWP 양식 필드 목록을 읽지 못했어요.', {cause: error})
  }

  if (!Array.isArray(parsed)) {
    throw new Error('HWP 양식 필드 목록 형식이 올바르지 않아요.')
  }

  return new Set(parsed.filter(isFieldRecord).map((field) => field.name))
}

const assertFieldUpdateSucceeded = (result: string) => {
  let parsed: unknown
  try {
    parsed = JSON.parse(result)
  } catch (error) {
    throw new Error('HWP 양식 필드 응답을 읽지 못했어요.', {cause: error})
  }

  if (typeof parsed === 'object' && parsed !== null && 'ok' in parsed && parsed.ok === false) {
    throw new Error('HWP 양식 필드가 수정되지 않았어요.')
  }
}

const createDocumentFieldValues = (form: ExpenseForm, fieldNames: ReadonlySet<string>) => {
  const fields = createExpenseFieldValues(form)
  const missingField = fields.find(
    (field) => (field.name !== 'date' || form.date !== null) && !fieldNames.has(field.name),
  )
  if (missingField !== undefined) {
    throw new Error(`HWP 양식에 ${missingField.name} 필드가 없어요.`)
  }

  return fields.filter((field) => fieldNames.has(field.name))
}

const configureTextMeasurement = () => {
  let context: CanvasRenderingContext2D | null = null
  let lastFont = ''
  Object.assign(globalThis, {
    measureTextWidth: (font: string, text: string) => {
      context ??= document.createElement('canvas').getContext('2d')
      if (context === null) {
        return 0
      }

      if (font !== lastFont) {
        context.font = font
        lastFont = font
      }

      return context.measureText(text).width
    },
  })
}

interface LoadedHwpDocument {
  readonly document: HwpDocument
  readonly pageCount: number
}

const loadHwpDocument = async (
  bytes: Uint8Array,
  fileName: string,
  nextEditor: RhwpEditor | null,
): Promise<LoadedHwpDocument> => {
  const nextDocument = new HwpDocument(bytes)
  if (nextEditor === null) {
    nextDocument.free()
    throw new Error('iframe editor is not ready')
  }

  try {
    const result = await nextEditor.loadFile(bytes, fileName, {suppressDialogs: true})
    return {document: nextDocument, pageCount: result.pageCount}
  } catch (error) {
    nextDocument.free()
    throw error
  }
}

const fetchExampleDocument = async () => {
  const response = await fetch(EXAMPLE_FILE_PATH)
  if (!response.ok) {
    throw new Error('예제 HWP 파일을 불러오지 못했어요.')
  }

  return new Uint8Array(await response.arrayBuffer())
}

interface RenderedPage {
  readonly index: number
  readonly svg: string
}

const renderDocumentPage = (
  document: HwpDocument | null,
  total: number | null,
  nextIndex: number,
): RenderedPage | null => {
  if (document === null || total === null || nextIndex < 0 || nextIndex >= total) {
    return null
  }

  return {index: nextIndex, svg: document.renderPageSvg(nextIndex)}
}

const createPageChangeHandler =
  (
    document: Accessor<HwpDocument | null>,
    total: Accessor<number | null>,
    setPageIndex: (index: number) => void,
    setPageSvg: (svg: string) => void,
  ) =>
  (nextIndex: number) => {
    const renderedPage = renderDocumentPage(document(), total(), nextIndex)
    if (renderedPage === null) {
      return
    }

    setPageIndex(renderedPage.index)
    setPageSvg(renderedPage.svg)
  }

export function HwpDocumentWorkspace() {
  const [documentInstance, setDocumentInstance] = createSignal<HwpDocument | null>(null)
  const [editor, setEditor] = createSignal<RhwpEditor | null>(null)
  const [pageCount, setPageCount] = createSignal<number | null>(null)
  const [directPageCount, setDirectPageCount] = createSignal<number | null>(null)
  const [directPageIndex, setDirectPageIndex] = createSignal(0)
  const [pageSvg, setPageSvg] = createSignal<string | null>(null)
  const [loadedFileName, setLoadedFileName] = createSignal('expense-form.hwp')
  const [viewerMode, setViewerMode] = createSignal<ViewerMode>('direct')
  const [statusMessage, setStatusMessage] = createSignal(
    'Rust/WASM 문서 엔진과 iframe 에디터 준비 중…',
  )
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isReady, setIsReady] = createSignal(false)
  const [isBusy, setIsBusy] = createSignal(false)
  let viewerHost: HTMLDivElement | undefined
  let disposed = false
  onMount(() => {
    configureTextMeasurement()
    // rhwp's wasm-bindgen initializer exposes this snake_case option.
    Promise.all([
      // oxlint-disable-next-line eslint-js/camelcase
      initWasm({module_or_path: wasmUrl}),
      createStudio(viewerHost!, {
        chrome: {menu: true, statusbar: true, toolbar: true},
        plugins: ['hwpctrl'],
        renderer: 'canvas2d',
      }),
    ])
      .then(([, nextEditor]) => {
        if (disposed) {
          nextEditor.destroy()
          return
        }

        nextEditor.element.title = 'HWP 문서 편집기'
        setEditor(nextEditor)
        setIsReady(true)
        setStatusMessage('Rust/WASM 문서 엔진과 iframe 에디터 준비 완료')
      })
      .catch(() => {
        setErrorMessage('Rust/WASM 문서 엔진 또는 iframe 에디터를 불러오지 못했어요.')
        setStatusMessage('문서 엔진을 준비하지 못했어요.')
      })
  })
  onCleanup(() => documentInstance()?.free())
  onCleanup(() => {
    disposed = true
    editor()?.destroy()
  })
  const loadDocument = async (bytes: Uint8Array, fileName: string) => {
    const loaded = await loadHwpDocument(bytes, fileName, editor())
    documentInstance()?.free()
    setDocumentInstance(loaded.document)
    setPageCount(loaded.pageCount)
    setDirectPageCount(loaded.document.pageCount())
    setDirectPageIndex(0)
    setPageSvg(loaded.document.renderPageSvg(0))
    setLoadedFileName(
      fileName.toLowerCase().endsWith(HWPX_EXTENSION)
        ? `${fileName.slice(0, -HWPX_EXTENSION.length)}${HWP_EXTENSION}`
        : fileName,
    )
    setStatusMessage(`${fileName} · ${loaded.pageCount}페이지 · iframe 에디터 준비 완료`)
  }
  const handleFileChange = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0]
    if (file === undefined || !isReady()) {
      return
    }

    setIsBusy(true)
    setErrorMessage(null)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      await loadDocument(bytes, file.name)
    } catch {
      setErrorMessage('이 파일을 열지 못했어요. HWP 또는 HWPX 파일인지 확인해 주세요.')
    } finally {
      setIsBusy(false)
    }
  }
  const handleExampleOpen = async () => {
    if (!isReady() || isBusy()) {
      return
    }

    setIsBusy(true)
    setErrorMessage(null)
    try {
      await loadDocument(await fetchExampleDocument(), EXAMPLE_FILE_NAME)
    } catch {
      setErrorMessage('예제 HWP 파일을 열지 못했어요. public 파일을 확인해 주세요.')
    } finally {
      setIsBusy(false)
    }
  }

  const handlePageChange = createPageChangeHandler(
    documentInstance,
    directPageCount,
    setDirectPageIndex,
    setPageSvg,
  )

  const handleApply = async (form: ExpenseForm) => {
    const document = documentInstance()
    const nextEditor = editor()
    if (document === null || nextEditor === null) {
      throw new Error('먼저 HWP 양식 파일을 열어 주세요.')
    }

    const fieldNames = readFieldNames(document)
    const values = createDocumentFieldValues(form, fieldNames)
    if (values.length === 0) {
      throw new Error('HWP 양식 필드를 찾지 못했어요.')
    }

    for (const field of values) {
      assertFieldUpdateSucceeded(document.setFieldValueByName(field.name, field.value))
    }
    const updatedBytes = document.exportHwp()
    const result = await nextEditor.loadFile(updatedBytes, loadedFileName(), {
      skipUnsavedGuard: true,
      suppressDialogs: true,
    })
    setPageCount(result.pageCount)
    setPageSvg(document.renderPageSvg(directPageIndex()))
    setStatusMessage(`양식 필드 적용 완료 · ${result.pageCount}페이지`)
  }

  return (
    <div class="grid gap-5">
      <HwpDocumentPanel
        directPageCount={directPageCount}
        directPageIndex={directPageIndex}
        errorMessage={errorMessage}
        isBusy={isBusy}
        isReady={isReady}
        onExampleOpen={handleExampleOpen}
        onFileChange={handleFileChange}
        onPageChange={handlePageChange}
        onViewerModeChange={setViewerMode}
        pageCount={pageCount}
        pageSvg={pageSvg}
        statusMessage={statusMessage}
        viewerMode={viewerMode}
        viewerHost={(element) => {
          viewerHost = element
        }}
      />

      <HwpExpenseAssistant onApply={handleApply} />

      <p class="m-0 text-xs leading-5 text-#8f8297">
        가계부 양식은 <code>date</code>, <code>item_1</code>, <code>unitPrice_1</code>,{' '}
        <code>quantity_1</code>, <code>amount_1</code>, <code>total</code>처럼 이름 있는 필드를
        포함해야 합니다. 현재는 해당 필드가 있는 양식에만 적용합니다.
      </p>
    </div>
  )
}
