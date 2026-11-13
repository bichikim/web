export interface TextCounts {
  readonly characters: number
  readonly withoutSpaces: number
  readonly bytes: number
}
export const countText = (text: string): TextCounts => {
  const segments = new Intl.Segmenter('ko', {granularity: 'grapheme'}).segment(text)
  let characters = 0
  let withoutSpaces = 0
  for (const {segment} of segments) {
    characters += 1
    if (!/^\s+$/u.test(segment)) {
      withoutSpaces += 1
    }
  }
  return {
    bytes: new TextEncoder().encode(text).length,
    characters,
    withoutSpaces,
  }
}
