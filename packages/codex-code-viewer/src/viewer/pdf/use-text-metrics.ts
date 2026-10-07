import {type Accessor, createEffect, onCleanup} from 'solid-js'
import type {PdfPageText} from './types'

interface TextMetricsOptions {
  readonly container: Accessor<HTMLElement | null>
  readonly text: Accessor<PdfPageText>
}
const measure = (span: HTMLElement, width: number): void => {
  const desired = Number(span.dataset.pdfWidth)
  if (width > 0 && desired > 0) {
    span.style.setProperty('--pdf-stretch', String(desired / width))
  }
}

/** Aligns selectable browser glyph widths with PDF glyph widths through custom properties. */
export const useTextMetrics = (options: TextMetricsOptions): void => {
  createEffect(() => {
    options.text()
    const container = options.container()
    if (container === null) {
      return
    }
    const spans = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-width]'))
    for (const span of spans) {
      measure(span, Number.parseFloat(getComputedStyle(span).width))
    }
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target instanceof HTMLElement) {
            measure(entry.target, entry.contentRect.width)
          }
        }
      })
      for (const span of spans) {
        observer.observe(span)
      }
      onCleanup(() => observer.disconnect())
    }
  })
}
