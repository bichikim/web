import {dirname, relative, resolve} from 'node:path'
import {type CodeSource, failure, success} from '../shared/contracts'
import {fileFormat, type SyntaxLanguage} from '../shared/file-formats'
import {getPathSpecifier} from './get-path-specifier'
import {readCodeSources} from './read-code-sources'
import {readSource, resolveFile} from './file-access'
import type {NavigationWorkspace} from './resolve-navigation'

interface PathNavigationOptions {
  readonly root: string
  readonly symbols: NavigationWorkspace['definitions']
  readonly hasAnalyzer: (language: SyntaxLanguage) => boolean
  readonly resolveModule: (path: string, specifier: string) => string | undefined
  readonly refresh: () => void
}

/** Resolves import paths with current compiler settings or the workspace language analyzer. */
export const createPathNavigation =
  (options: PathNavigationOptions): NavigationWorkspace['followPath'] =>
  (path, offset, drafts: readonly CodeSource[] = []) => {
    options.refresh()
    const sources = readCodeSources(options.root, drafts)
    if (!sources.ok) {
      return sources
    }
    const resolvedSource = resolveFile(options.root, path)
    if (!resolvedSource.ok) {
      return resolvedSource
    }
    const draft = sources.value.get(resolvedSource.value)
    const source = draft === undefined ? readSource(options.root, path) : success(draft)
    if (!source.ok) {
      return source
    }
    const format = fileFormat(path)
    if (format?.kind === 'syntax' && options.hasAnalyzer(format.language)) {
      return options.symbols(path, offset, drafts)
    }
    const specifier = getPathSpecifier({offset, path, source: source.value})
    if (specifier === null) {
      return failure('invalid-position')
    }
    const file = resolve(options.root, path)
    const module = options.resolveModule(path, specifier)
    const target = module ?? resolve(dirname(file), specifier)
    const resolved = resolveFile(options.root, target)
    return resolved.ok
      ? success([{column: 1, line: 1, path: relative(options.root, resolved.value)}])
      : resolved
  }
