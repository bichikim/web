import {getDocument, type PDFDocumentLoadingTask, PDFWorker} from 'pdfjs-dist/legacy/build/pdf.mjs'
// Vite's ?raw transform supplies a default string export absent from the original module.
// oxlint-disable-next-line import/default
import workerSource from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?raw'
import {createTextReader} from './create-text-reader'
import {BinaryDataFactory} from './binary-data-factory'
import type {PdfLoad} from './types'

/** Opens a local PDF with a worker owned by the returned disposable load. */
export const createDocument = (blob: Blob): PdfLoad => {
  const url = URL.createObjectURL(new Blob([workerSource], {type: 'text/javascript'}))
  let thread: Worker
  try {
    thread = new Worker(url, {type: 'module'})
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  let worker: PDFWorker
  try {
    worker = PDFWorker.create({port: thread})
  } catch (error) {
    thread.terminate()
    URL.revokeObjectURL(url)
    throw error
  }
  let task: PDFDocumentLoadingTask | null = null
  let disposed = false
  const destroy = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    const cleanup = task?.destroy() ?? Promise.resolve()
    cleanup
      .finally(() => {
        worker.destroy()
        thread.terminate()
        URL.revokeObjectURL(url)
      })
      .catch((reason: unknown) => console.warn('PDF worker cleanup failed', reason))
  }
  const result = blob.arrayBuffer().then(async (buffer) => {
    if (disposed) {
      throw new Error('PDF loading was cancelled.')
    }
    task = getDocument({
      BinaryDataFactory,
      data: new Uint8Array(buffer),
      enableXfa: false,
      isOffscreenCanvasSupported: false,
      useSystemFonts: true,
      useWorkerFetch: false,
      worker,
    })
    const document = await task.promise
    const read = createTextReader(document)
    return {
      page: async (number: number) => {
        const page = await document.getPage(number)
        const viewport = page.getViewport({scale: 1})
        return {
          height: viewport.height,
          render: (canvas: HTMLCanvasElement, scale: number, ratio: number) => {
            const rendered = page.render({
              canvas,
              transform: [ratio, 0, 0, ratio, 0, 0],
              viewport: page.getViewport({scale}),
            })
            return {
              cancel: () => rendered.cancel(),
              result: rendered.promise.finally(() => page.cleanup()),
            }
          },
          text: () => read(number),
          width: viewport.width,
        }
      },
      pages: document.numPages,
      text: (number: number) => read(number).then((value) => value.source),
    }
  })
  return {destroy, result}
}
