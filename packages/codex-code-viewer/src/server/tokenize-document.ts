import type {CodeToken} from '../shared/contracts'
import {fileFormat} from '../shared/file-formats'
import {tokenizeSource} from './tokenize-source'
import {tokenizeSyntax} from './tokenize-syntax'

/** Tokenizes a text document according to its file format while preserving line offsets. */
export const tokenizeDocument = (path: string, source: string): CodeToken[][] => {
  const format = fileFormat(path)
  if (format?.kind === 'syntax') {
    return tokenizeSyntax(format.language, source)
  }
  if (format?.kind === 'code') {
    return tokenizeSource(path, source)
  }
  let offset = 0
  return source.split(/\r\n|\n|\r/u).map((text) => {
    const token: CodeToken = {kind: 'plain', navigation: null, offset, text}
    offset +=
      text.length +
      (source.slice(offset + text.length, offset + text.length + 2) === '\r\n' ? 2 : 1)
    return [token]
  })
}
