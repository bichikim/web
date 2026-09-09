export interface TextCounts {
  readonly characters: number
  readonly withoutSpaces: number
  readonly bytes: number
}
export const countText = (text: string): TextCounts => {
  const segments = Array.from(new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(text))
  return {
    bytes: new TextEncoder().encode(text).length,
    characters: segments.length,
    withoutSpaces: segments.filter((item) => !/^\s+$/u.test(item.segment)).length,
  }
}
