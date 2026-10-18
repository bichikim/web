import typescript from '@typescript/typescript6'
import {readImportReferences} from './read-import-references'
import {parseSource} from '../parse-source'
import {readExportedFunction} from '../read-exported-function'
import type {SourcePoint} from './types'

interface DirectReferencesOptions {
  readonly includeUsages?: boolean
  readonly input: SourcePoint
  readonly paths: readonly string[]
  readonly read: (path: string) => string | undefined
  readonly resolve: (file: string, specifier: string) => readonly string[]
}
/** Finds direct relative named-import edges to an unambiguous exported function declaration. */
export const readDirectReferences = ({
  includeUsages = false,
  input,
  paths,
  read,
  resolve,
}: DirectReferencesOptions): SourcePoint[] => {
  const name = readExportedFunction(input)
  if (name === undefined) {
    return []
  }
  return paths.flatMap((file) => {
    const text = read(file)
    if (text === undefined || !text.includes(name)) {
      return []
    }
    const tree = parseSource(file, text)
    const verified =
      tree?.statements.flatMap((statement) => {
        if (
          !typescript.isImportDeclaration(statement) ||
          !typescript.isStringLiteral(statement.moduleSpecifier) ||
          !statement.moduleSpecifier.text.startsWith('.')
        ) {
          return []
        }
        const bindings = statement.importClause?.namedBindings
        if (bindings === undefined || !typescript.isNamedImports(bindings)) {
          return []
        }
        const matching = bindings.elements.filter((binding) => {
          const imported = binding.propertyName ?? binding.name
          return typescript.isIdentifier(imported) && imported.text === name
        })
        if (matching.length === 0) {
          return []
        }
        const resolved = resolve(file, statement.moduleSpecifier.text)
        return resolved.length > 0 && resolved.every((path) => path === input.file) ? matching : []
      }) ?? []
    const imports = verified.map((binding) => ({
      file,
      offset: (binding.propertyName ?? binding.name).getStart(tree),
      source: text,
    }))
    return includeUsages && tree !== undefined && verified.length > 0
      ? [
          ...imports,
          ...readImportReferences(tree, verified).map((offset) => ({file, offset, source: text})),
        ]
      : imports
  })
}
