import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from 'solid-js'
import type {PdfViewState} from './view-state/types'
import {createDocument} from './pdf/create-document'
import type {PdfDocument, PdfRender} from './pdf/types'

interface PdfOptions {
  readonly blob: Accessor<Blob>
  readonly canvas: Accessor<HTMLCanvasElement | null>
  readonly width: Accessor<number>
  readonly initial?: () => PdfViewState | undefined
  readonly onError?: (error: unknown) => void
}
const BASE_PERCENT = 100
const MIN_PERCENT = 25
const MAX_PERCENT = 400
const MAX_PIXELS = 16777216

export const usePdfDocument = (options: PdfOptions) => {
  const [document, setDocument] = createSignal<PdfDocument | null>(null)
  const [page, setPage] = createSignal(1)
  const [percent, setPercent] = createSignal(BASE_PERCENT)
  const [fitting, setFitting] = createSignal(true)
  const [size, setSize] = createSignal({height: 0, ratio: 1, scale: 1, width: 0})
  const [pending, setPending] = createSignal(true)
  const [error, setError] = createSignal<string | null>(null)
  const pages = createMemo(() => document()?.pages ?? 0)
  const report = (reason: unknown): void => {
    const message = 'PDF를 표시할 수 없습니다. 파일이 손상되었거나 암호가 필요한지 확인해 주세요.'
    setError(message)
    untrack(() => options.onError?.(new Error(message, {cause: reason})))
  }
  createEffect(() => {
    const blob = options.blob()
    const saved = untrack(() => options.initial?.())
    setDocument(null)
    setPage(1)
    setPending(true)
    setError(null)
    let disposed = false
    try {
      const loading = createDocument(blob)
      onCleanup(() => {
        disposed = true
        loading.destroy()
      })
      loading.result
        .then((value) => {
          if (!disposed) {
            batch(() => {
              setPage(Math.min(value.pages, Math.max(1, saved?.page ?? 1)))
              setPercent(saved?.percent ?? BASE_PERCENT)
              setFitting(saved?.fitting ?? true)
              setDocument(value)
            })
          }
        })
        .catch((reason: unknown) => {
          if (!disposed) {
            setPending(false)
            report(reason)
          }
        })
    } catch (reason) {
      setPending(false)
      report(reason)
    }
  })
  createEffect(() => {
    const current = document()
    const number = page()
    const target = options.canvas()
    const available = options.width()
    const fit = fitting()
    const requested = percent()
    if (current === null || target === null) {
      return
    }
    let disposed = false
    let drawing: PdfRender | null = null
    setPending(true)
    onCleanup(() => {
      disposed = true
      drawing?.cancel()
    })
    current
      .page(number)
      .then(async (value) => {
        if (disposed) {
          return
        }
        const scale = fit && available > 0 ? available / value.width : requested / BASE_PERCENT
        const width = value.width * scale
        const height = value.height * scale
        const ratio = Math.min(
          globalThis.devicePixelRatio || 1,
          Math.sqrt(MAX_PIXELS / (width * height)),
        )
        setSize({height, ratio, scale, width})
        drawing = value.render(target, scale, ratio)
        await drawing.result
        if (!disposed) {
          setPending(false)
        }
      })
      .catch((reason: unknown) => {
        if (!disposed) {
          setPending(false)
          report(reason)
        }
      })
  })
  return {
    document,
    error,
    fit: () => setFitting(true),
    fitting,
    page,
    pages,
    pending,
    percent: () => (fitting() ? Math.round(size().scale * BASE_PERCENT) : percent()),
    size,
    snapshot: (): PdfViewState | undefined =>
      document() === null ? undefined : {fitting: fitting(), page: page(), percent: percent()},
    turn: (number: number) => setPage(Math.min(Math.max(1, Math.round(number)), pages() || 1)),
    zoom: (value: number) => {
      if (Number.isFinite(value) && value > 0) {
        setPercent(Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, value)))
        setFitting(false)
      }
    },
  }
}
