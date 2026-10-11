import {fileFormat, type SyntaxLanguage} from '../shared/file-formats'
import {createPythonNavigation} from './create-python-navigation'
import {createRubyNavigation} from './create-ruby-navigation'
import {createRustNavigation} from './create-rust-navigation'
import type {SourceChange, SymbolQuery} from './types'
import {failure} from '../shared/contracts'

/** Owns the external language analyzers for a workspace and releases them together. */
export const createSyntaxNavigation = (root: string) => {
  const createAnalyzers = () =>
    new Map<SyntaxLanguage, ReturnType<typeof createPythonNavigation>>([
      ['python', createPythonNavigation(root)],
      ['rust', createRustNavigation(root)],
      ['ruby', createRubyNavigation(root)],
    ])
  let analyzers = createAnalyzers()
  return {
    dispose: () => analyzers.forEach((analyzer) => analyzer.dispose()),
    has: (language: SyntaxLanguage) => analyzers.has(language),
    lookupSymbols: (query: SymbolQuery) => {
      const format = fileFormat(query.path)
      const analyzer = format?.kind === 'syntax' ? analyzers.get(format.language) : undefined
      return (
        analyzer?.lookupSymbols(query.path, query.source, query.offset, query) ??
        failure('unsupported-file')
      )
    },
    reset: () => {
      analyzers.forEach((analyzer) => analyzer.dispose())
      analyzers = createAnalyzers()
    },
    update: (changes: readonly SourceChange[]) => {
      for (const [language, analyzer] of analyzers) {
        analyzer.update(
          changes.filter((change) => {
            const format = fileFormat(change.path)
            return format?.kind === 'syntax' && format.language === language
          }),
        )
      }
    },
  }
}
