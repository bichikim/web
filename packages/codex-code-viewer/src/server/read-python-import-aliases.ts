import {tokenizeSyntax} from './tokenize-syntax'

/** Maps imported name positions to their local alias offsets, excluding comments and literals. */
export const readPythonImportAliases = (source: string): ReadonlyMap<string, number> => {
  const aliases = new Map<string, number>()
  let importing = false
  let depth = 0
  let previous = ''
  let imported = ''
  for (const [index, line] of tokenizeSyntax('python', source).entries()) {
    for (const token of line) {
      const column = token.offset - (line[0]?.offset ?? 0) + 1
      const text = token.text.trim()
      if (text !== '' && token.kind !== 'comment' && token.kind !== 'string') {
        if (text === 'import') {
          importing = true
        } else if (text === ';') {
          importing = false
        }
        if (importing && previous === 'as' && token.navigation === 'definition') {
          aliases.set(imported, token.offset)
        }
        if (token.navigation === 'definition') {
          imported = `${index + 1}:${column}`
        }
        depth += [...text].filter((value) => value === '(').length
        depth -= [...text].filter((value) => value === ')').length
        previous = text
      }
    }
    if (depth === 0 && previous !== '\\') {
      importing = false
      previous = ''
    }
  }
  return aliases
}
