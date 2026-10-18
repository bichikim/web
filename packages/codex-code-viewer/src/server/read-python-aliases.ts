import {readPythonImportAliases} from './read-python-import-aliases'
import {offsetPosition} from './lsp/offset-position'
import {pythonAssignments, readPythonStatements} from './read-python-statements'
import type {CodeToken} from '../shared/contracts'

const identifier = (token: CodeToken): boolean =>
  token.navigation === 'definition' && /^[\p{ID_Start}_][\p{ID_Continue}]*$/u.test(token.text)

/** Maps imports and name-valued assignment components to their local binding offsets. */
export const readPythonAliases = (source: string): ReadonlyMap<string, number> => {
  const aliases = new Map(readPythonImportAliases(source))
  const link = (target: CodeToken, binding: CodeToken) => {
    const position = offsetPosition(source, target.offset)
    aliases.set(`${position.line + 1}:${position.character + 1}`, binding.offset)
  }
  for (const statement of readPythonStatements(source)) {
    for (const {bindings, value} of pythonAssignments(statement)) {
      const qualified =
        value.length % 2 === 1 &&
        value.every((token, index) => (index % 2 === 0 ? identifier(token) : token.text === '.'))
      const target = value.at(-1)
      if (qualified && target !== undefined) {
        const chain = [...bindings, target]
        chain.slice(1).forEach((token, index) => link(token, chain[index]))
      }
    }
  }
  return aliases
}
