export const normalizeNewlines = (text: string): string =>
  text.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
