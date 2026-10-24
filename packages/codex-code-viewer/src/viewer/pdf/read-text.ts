import type {PdfText} from './types'

interface TextItem {
  readonly str: string
  readonly hasEOL: boolean
}
interface TextMetadata {
  readonly type: string
}

/** Concatenates PDF text items and retains their original character ranges. */
export const readText = (items: readonly (TextItem | TextMetadata)[]): PdfText => {
  let length = 0
  const parts: string[] = []
  const offsets = items.flatMap((item) => {
    if (!('str' in item)) {
      return []
    }
    const start = length
    parts.push(item.str)
    length += item.str.length
    const end = length
    if (item.hasEOL) {
      parts.push('\n')
      length += 1
    }
    return [{end, start}]
  })
  return {offsets, source: parts.join('')}
}
