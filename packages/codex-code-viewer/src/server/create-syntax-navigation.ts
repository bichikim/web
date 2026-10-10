import type {SyntaxLanguage} from '../shared/file-formats'
import {createPythonNavigation} from './create-python-navigation'
import {createRubyNavigation} from './create-ruby-navigation'
import {createRustNavigation} from './create-rust-navigation'

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
    get: (language: SyntaxLanguage) => analyzers.get(language),
    has: (language: SyntaxLanguage) => analyzers.has(language),
    reset: () => {
      analyzers.forEach((analyzer) => analyzer.dispose())
      analyzers = createAnalyzers()
    },
  }
}
