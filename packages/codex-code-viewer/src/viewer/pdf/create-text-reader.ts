import type {PDFPageProxy} from 'pdfjs-dist/legacy/build/pdf.mjs'
import {createBoundedCache} from '../../shared/create-bounded-cache'
import {readPageText} from './read-page-text'
import type {PdfPageText} from './types'

interface TextDocument {
  readonly getPage: (
    number: number,
  ) => Promise<Pick<PDFPageProxy, 'getTextContent' | 'getViewport'>>
}
const RUN_BYTES = 128
const CHARACTER_BYTES = 4
/** Shares concurrent text extraction and bounds retained text and glyph geometry. */
export const createTextReader = (
  document: TextDocument,
): ((page: number) => Promise<PdfPageText>) => {
  const texts = createBoundedCache<PdfPageText>({
    maxEntries: 2048,
    maxWeight: 8388608,
    weight: (text) => text.source.length * CHARACTER_BYTES + text.runs.length * RUN_BYTES,
  })
  const pending = new Map<number, Promise<PdfPageText>>()
  return (number) => {
    const cached = texts.get(String(number))
    if (cached !== undefined) {
      return Promise.resolve(cached)
    }
    const current = pending.get(number)
    if (current !== undefined) {
      return current
    }
    const reading = document
      .getPage(number)
      .then(async (page) => {
        const content = await page.getTextContent()
        const text = readPageText(content, page.getViewport({scale: 1}).transform)
        texts.set(String(number), text)
        return text
      })
      .finally(() => pending.delete(number))
    pending.set(number, reading)
    return reading
  }
}
