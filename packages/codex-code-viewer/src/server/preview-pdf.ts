import {existsSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {getDocument, GlobalWorkerOptions, type PDFPageProxy} from 'pdfjs-dist/legacy/build/pdf.mjs'
import {failure, type Result, success} from '../shared/contracts'
import {readMediaBytes} from './read-media-bytes'
import {readMediaInfo} from './read-media-info'

const MAX_PDF_BYTES = 16777216
const MAX_PREVIEW_BYTES = 90000
const MAX_PAGE_TEXT = 20000
const MAX_RENDER_WIDTH = 1200
const MAX_RENDER_HEIGHT = 1600
const HIGH_JPEG_QUALITY = 80
const MEDIUM_JPEG_QUALITY = 60
const LOW_JPEG_QUALITY = 40
const MEDIUM_RENDER_SCALE = 0.75
const SMALL_RENDER_SCALE = 0.5
const JPEG_QUALITIES = [HIGH_JPEG_QUALITY, MEDIUM_JPEG_QUALITY, LOW_JPEG_QUALITY]
const RENDER_SCALES = [1, MEDIUM_RENDER_SCALE, SMALL_RENDER_SCALE]
interface PdfRequest {
  readonly root: string
  readonly path: string
  readonly revision: string
  readonly page: number
}
interface PdfPreview {
  readonly kind: 'pdf'
  readonly page: number
  readonly pages: number
  readonly width: number
  readonly height: number
  readonly uri: string
  readonly text: string
}
interface PdfCanvasTarget {
  readonly canvas: {toBuffer: (mime: 'image/jpeg', quality: number) => Buffer}
  readonly context: CanvasRenderingContext2D
}
interface PdfCanvasFactory {
  readonly create: (width: number, height: number) => PdfCanvasTarget
  readonly destroy: (target: PdfCanvasTarget) => void
}
const packagedWorker = new URL('./pdf.worker.js', import.meta.url)
const packaged = existsSync(packagedWorker)
GlobalWorkerOptions.workerSrc = packaged
  ? packagedWorker.href
  : import.meta.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
const assets = packaged
  ? fileURLToPath(new URL('./pdf-assets/', import.meta.url))
  : dirname(fileURLToPath(import.meta.resolve('pdfjs-dist/package.json')))

const renderPage = async (
  page: PDFPageProxy,
  factory: PdfCanvasFactory,
): Promise<Buffer | undefined> => {
  const natural = page.getViewport({scale: 1})
  const fitting = Math.min(MAX_RENDER_WIDTH / natural.width, MAX_RENDER_HEIGHT / natural.height)
  for (const reduction of RENDER_SCALES) {
    const viewport = page.getViewport({scale: fitting * reduction})
    const target = factory.create(Math.ceil(viewport.width), Math.ceil(viewport.height))
    try {
      // eslint-disable-next-line no-await-in-loop -- Smaller renders are needed only after larger encodings exceed the limit.
      await page.render({canvas: null, canvasContext: target.context, viewport}).promise
      for (const quality of JPEG_QUALITIES) {
        const buffer = target.canvas.toBuffer('image/jpeg', quality)
        if (buffer.length <= MAX_PREVIEW_BYTES) {
          return buffer
        }
      }
    } finally {
      factory.destroy(target)
    }
  }
  return undefined
}

/** Renders one local PDF page through PDF.js's public Node canvas factory. */
export const previewPdf = async (request: PdfRequest): Promise<Result<PdfPreview>> => {
  const info = readMediaInfo(request.root, request.path)
  if (!info.ok) {
    return info
  }
  if (info.value.revision !== request.revision) {
    return failure('stale-document')
  }
  if (info.value.media.kind !== 'pdf') {
    return failure('unsupported-file')
  }
  if (info.value.media.size > MAX_PDF_BYTES) {
    return failure('media-too-large')
  }
  const bytes = readMediaBytes({...request, size: info.value.media.size})
  if (!bytes.ok) {
    return bytes
  }
  const loading = getDocument({
    cMapPacked: true,
    cMapUrl: `${join(assets, 'cmaps')}/`,
    data: Uint8Array.from(bytes.value),
    enableXfa: false,
    standardFontDataUrl: `${join(assets, 'standard_fonts')}/`,
    useSystemFonts: false,
    useWorkerFetch: false,
    wasmUrl: `${join(assets, 'wasm')}/`,
  })
  try {
    const document = await loading.promise
    if (!Number.isInteger(request.page) || request.page < 1 || request.page > document.numPages) {
      return failure('invalid-position')
    }
    const page = await document.getPage(request.page)
    const viewport = page.getViewport({scale: 1})
    const image = await renderPage(page, document.canvasFactory as PdfCanvasFactory)
    if (image === undefined) {
      return failure('media-too-large')
    }
    const content = await page.getTextContent()
    const text = content.items
      .flatMap((item) => ('str' in item ? [item.str] : []))
      .join(' ')
      .slice(0, MAX_PAGE_TEXT)
    return success({
      height: viewport.height,
      kind: 'pdf',
      page: request.page,
      pages: document.numPages,
      text,
      uri: `data:image/jpeg;base64,${image.toString('base64')}`,
      width: viewport.width,
    })
  } catch {
    return failure('read-failed')
  } finally {
    await loading.destroy()
  }
}
