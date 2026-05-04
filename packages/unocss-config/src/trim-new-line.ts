export function trimNewLine(string?: string) {
  if (!string) {
    return ''
  }

  // eslint-disable-next-line require-unicode-regexp
  // oxlint-disable-next-line eslint-js/require-unicode-regexp
  return string.replaceAll(/\s+\n?\s*/g, ' ')
}
