import {createEffect, createMemo, createSignal, onCleanup, Show} from 'solid-js'
import {useFileViewState} from './view-state/context'
import {SFindBar} from './SFindBar'
import {usePdfSearch} from './pdf/use-search'
import {useSearchShortcut} from './pdf/use-search-shortcut'
import {SPdfTextLayer} from './SPdfTextLayer'
import {usePageText} from './pdf/use-page-text'
import {SPdfToolbar} from './SPdfToolbar'
import {usePdfDocument} from './use-pdf-document'

interface SPdfDocumentProps {
  blob: Blob
  path: string
  onError?: (error: unknown) => void
}
const PADDING = 32

export const SPdfDocument = (props: SPdfDocumentProps) => {
  const state = useFileViewState()
  const [canvas, setCanvas] = createSignal<HTMLCanvasElement | null>(null)
  const [viewport, setViewport] = createSignal<HTMLDivElement | null>(null)
  const [width, setWidth] = createSignal(0)
  const pdf = usePdfDocument({
    blob: () => props.blob,
    canvas,
    initial: () => state?.read()?.pdf,
    onError: (error) => props.onError?.(error),
    width,
  })
  const pageText = usePageText({
    document: pdf.document,
    onError: (error) => props.onError?.(error),
    page: pdf.page,
  })
  const error = createMemo(() => pdf.error() ?? pageText.error()?.message ?? null)
  const search = usePdfSearch({document: pdf.document, turn: pdf.turn})
  const matches = createMemo(() => search.matches().filter((match) => match.page === pdf.page()))
  const active = createMemo(() => matches().findIndex((match) => match === search.current()))
  useSearchShortcut({container: viewport, open: search.open})
  const closeSearch = (): void => {
    search.close()
    viewport()?.focus({preventScroll: true})
  }
  createEffect(() => {
    const snapshot = pdf.snapshot()
    if (snapshot !== undefined) {
      state?.update({pdf: snapshot})
    }
  })
  createEffect(() => {
    const target = viewport()
    if (target === null) {
      return
    }
    setWidth(Math.max(0, target.clientWidth - PADDING))
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        const rectangle = entries[0]?.contentRect
        if (rectangle !== undefined) {
          setWidth(Math.max(0, rectangle.width))
        }
      })
      observer.observe(target)
      onCleanup(() => observer.disconnect())
    }
  })
  return (
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <SPdfToolbar pdf={pdf} onFind={() => search.open()} />
      <Show when={search.visible()}>
        <SFindBar
          query={search.query()}
          count={search.matches().length}
          active={search.active()}
          focusRequest={search.focusRequest()}
          onChange={search.change}
          onMove={search.move}
          onClose={closeSearch}
        />
        <Show when={search.status()}>
          {(message) => (
            <p role="status" class="m-0 px-4 py-1 text-xs text-muted">
              {message()}
            </p>
          )}
        </Show>
      </Show>
      <Show when={props.onError === undefined ? error() : null}>
        {(message) => (
          <p role="status" class="m-0 p-4 text-sm text-muted">
            {message()}
          </p>
        )}
      </Show>
      <Show when={pdf.pending() && pdf.error() === null}>
        <p role="status" class="m-0 shrink-0 px-4 py-1 text-sm text-muted">
          PDF 불러오는 중…
        </p>
      </Show>
      <div
        aria-label="PDF 페이지 보기"
        tabIndex={0}
        class="min-h-0 min-w-0 flex-1 overflow-auto p-4"
        ref={setViewport}
      >
        <div
          class="relative mx-auto overflow-hidden bg-white shadow-sm
          [height:var(--pdf-height)] [width:var(--pdf-width)]"
          style={{'--pdf-height': `${pdf.size().height}px`, '--pdf-width': `${pdf.size().width}px`}}
        >
          <canvas
            aria-label={`${props.path} ${pdf.page()}페이지`}
            class="block h-full w-full"
            ref={setCanvas}
            width={Math.max(1, Math.ceil(pdf.size().width * pdf.size().ratio))}
            height={Math.max(1, Math.ceil(pdf.size().height * pdf.size().ratio))}
          />
          <Show when={pdf.pending() ? null : pageText.text()}>
            {(value) => (
              <SPdfTextLayer
                text={value()}
                scale={pdf.size().scale}
                matches={matches()}
                activeMatch={active()}
                scrollRequest={search.scrollRequest()}
              />
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}
