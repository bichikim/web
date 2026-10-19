import {type Accessor, createEffect, createSignal, onCleanup, untrack} from 'solid-js'
import type {PdfDocument, PdfPageText} from './types'

interface PageTextOptions {
  readonly document: Accessor<PdfDocument | null>
  readonly page: Accessor<number>
  readonly onError?: (error: unknown) => void
}
interface PageTextResult {
  readonly text: Accessor<PdfPageText | null>
  readonly error: Accessor<Error | null>
}
/** Loads current-page text independently from zoom, ignoring departed pages and documents. */
export const usePageText = (options: PageTextOptions): PageTextResult => {
  const [error, setError] = createSignal<Error | null>(null)
  const [text, setText] = createSignal<PdfPageText | null>(null)
  createEffect(() => {
    const document = options.document()
    const number = options.page()
    setText(null)
    setError(null)
    if (document === null) {
      return
    }
    let disposed = false
    onCleanup(() => {
      disposed = true
    })
    document
      .page(number)
      .then((page) => page.text())
      .then((value) => {
        if (!disposed) {
          setText(value)
        }
      })
      .catch((cause: unknown) => {
        if (!disposed) {
          const failure = new Error('PDF 텍스트를 읽을 수 없어 선택할 수 없습니다.', {cause})
          setError(failure)
          untrack(() => options.onError?.(failure))
        }
      })
  })
  return {error, text}
}
