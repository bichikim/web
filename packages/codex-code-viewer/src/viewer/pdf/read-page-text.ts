import {readText} from './read-text'
import type {PdfPageText, PdfTextRun} from './types'

interface TextItem {
  readonly dir: string
  readonly fontName: string
  readonly hasEOL: boolean
  readonly height: number
  readonly str: string
  readonly transform: readonly number[]
  readonly width: number
}
interface TextMetadata {
  readonly type: string
}
interface TextFont {
  readonly ascent?: number
  readonly descent?: number
  readonly fontFamily: string
  readonly vertical?: boolean
}
interface TextContent {
  readonly items: readonly (TextItem | TextMetadata)[]
  readonly styles: Readonly<Record<string, TextFont>>
}
const FALLBACK_ASCENT = 0.8

/** Translates PDF text into viewport positions and original searchable character ranges. */
export const readPageText = (content: TextContent, viewport: readonly number[]): PdfPageText => {
  const text = readText(content.items)
  const scale = Math.hypot(viewport[0], viewport[1])
  const items = content.items.filter((item): item is TextItem => 'str' in item)
  const runs = items.map((item, index): PdfTextRun => {
    const font = content.styles[item.fontName]
    const matrix = item.transform
    const height = Math.hypot(
      viewport[0] * matrix[2] + viewport[2] * matrix[3],
      viewport[1] * matrix[2] + viewport[3] * matrix[3],
    )
    const angle =
      Math.atan2(
        viewport[1] * matrix[0] + viewport[3] * matrix[1],
        viewport[0] * matrix[0] + viewport[2] * matrix[1],
      ) + (font?.vertical ? Math.PI / 2 : 0)
    const ascent =
      height * (font?.ascent ?? (font?.descent === undefined ? FALLBACK_ASCENT : 1 + font.descent))
    return {
      angle,
      direction: item.dir === 'rtl' ? 'rtl' : 'ltr',
      font: font?.fontFamily ?? 'sans-serif',
      height,
      lineBreak: item.hasEOL,
      offset: text.offsets[index].start,
      text: item.str,
      width: (font?.vertical ? item.height : item.width) * scale,
      x: viewport[0] * matrix[4] + viewport[2] * matrix[5] + viewport[4] + ascent * Math.sin(angle),
      y: viewport[1] * matrix[4] + viewport[3] * matrix[5] + viewport[5] - ascent * Math.cos(angle),
    }
  })
  return {...text, runs}
}
