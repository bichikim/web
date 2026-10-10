import {createProjectLanguages} from './create-project-languages'
import {createCodeLocationReader} from './create-code-location-reader'
import {realpathSync, statSync} from 'node:fs'
import {relative, resolve, sep} from 'node:path'
import {createPathNavigation} from './create-path-navigation'
import {
  type CodeLocation,
  type CodeSource,
  failure,
  type Result,
  success,
  type WorkspaceEntry,
} from '../shared/contracts'
import {readCodeSources} from './read-code-sources'
import {writeSource} from './write-source'
import {createEntry} from './create-entry'
import {createFileOperations} from './file-operations'
import {createSyntaxNavigation} from './create-syntax-navigation'
import {fileFormat} from '../shared/file-formats'
import {createLanguageService} from './create-language-service'
import {findWorkspace, readSource, resolveFile} from './file-access'
import {createDocumentReader} from './create-document-reader'
import {createFileIndex} from './create-file-index'
import {readMedia} from './read-media'
import {createNavigationWorker} from './create-navigation-worker'
import {createNavigationStream, type SymbolLookupOptions} from './create-navigation-stream'
import {
  createNavigationCache,
  createNavigationIndex,
  type NavigationReview,
} from './navigation-cache'
import {observeNavigationConfiguration} from './observe-navigation-configuration'

export const createWorkspace = (anchor: string) => {
  const canonical = realpathSync(anchor)
  const root = statSync(canonical).isDirectory() ? canonical : findWorkspace(canonical)
  const languages = createProjectLanguages(root)
  const navigation = createSyntaxNavigation(root)
  const index = createFileIndex(root)
  const reader = createDocumentReader(root)
  const background = createNavigationWorker(root)
  const configuration = observeNavigationConfiguration(index, {
    background,
    languages,
    navigation,
  })
  const symbols = (
    path: string,
    offset: number,
    drafts: readonly CodeSource[] = [],
    lookup: SymbolLookupOptions = {kind: 'definition'},
  ): Result<CodeLocation[]> | Promise<Result<CodeLocation[]>> => {
    configuration.refresh()
    const {kind, retained = [], files: reviewed} = lookup
    const sources = readCodeSources(root, drafts)
    if (!sources.ok) {
      return sources
    }
    const file = resolveFile(root, path)
    if (!file.ok) {
      return file
    }
    const draft = sources.value.get(file.value)
    const source = draft === undefined ? readSource(root, path) : success(draft)
    if (!source.ok) {
      return source
    }
    if (offset < 0 || offset >= source.value.length) {
      return failure('invalid-position')
    }
    const format = fileFormat(path)
    const analyzer = format?.kind === 'syntax' ? navigation.get(format.language) : undefined
    if (analyzer !== undefined) {
      const file = resolveFile(root, path)
      return file.ok ? analyzer.lookupSymbols(file.value, source.value, offset, kind) : file
    }
    const language =
      drafts.length === 0 ? languages.get(path) : createLanguageService(file.value, sources.value)
    const locations = (
      targets: readonly {fileName: string; textSpan: {start: number}}[],
    ): Result<CodeLocation[]> => {
      if (drafts.length > 0) {
        language.dispose()
      }
      const readLocation = createCodeLocationReader(root, sources.value)
      const unchanged = new Set(retained)
      return success(
        targets.flatMap((target) => {
          if (unchanged.has(relative(root, target.fileName).split(sep).join('/'))) {
            return []
          }
          const location = readLocation(target.fileName, target.textSpan.start)
          return location.ok ? [location.value] : []
        }),
      )
    }
    if (kind === 'definition') {
      return locations(language.definitions(file.value, offset))
    }
    const projectFiles =
      reviewed === undefined
        ? index.tree().then((tree) => tree.files.map((entry) => entry.path))
        : Promise.resolve(reviewed)
    return projectFiles.then((paths) =>
      locations(
        language.references(
          file.value,
          offset,
          paths
            .filter((path) => fileFormat(path)?.kind === 'code')
            .flatMap((path) => {
              const resolved = resolveFile(root, path)
              return resolved.ok ? [resolved.value] : []
            }),
        ),
      ),
    )
  }
  const followPath = createPathNavigation({
    hasAnalyzer: navigation.has,
    refresh: configuration.refresh,
    resolveModule: (path, specifier) =>
      languages.get(path).resolveModule(resolve(root, path), specifier),
    root,
    symbols,
  })
  const cachedNavigation = createNavigationCache({
    index: createNavigationIndex({
      changes: index,
      onConfigurationChange: configuration.reset,
      root,
    }),
    read: reader.read,
    scan: createNavigationStream({background, followPath, read: reader.read, root, symbols}),
  })
  return {
    create: (parent: string, name: string, kind: WorkspaceEntry['kind']) =>
      createEntry({kind, name, parent, root}),
    definitions: (path: string, offset: number, drafts: readonly CodeSource[] = []) =>
      symbols(path, offset, drafts),
    dispose: () => {
      configuration.dispose()
      cachedNavigation.dispose()
      background.dispose()
      index.dispose()
      reader.dispose()
      languages.dispose()
      navigation.dispose()
    },
    followPath,
    list: index.list,
    media: (path: string, revision: string, offset: number) =>
      readMedia({offset, path, revision, root}),
    observe: index.observe,
    operations: createFileOperations(root),
    read: (...input: Parameters<typeof reader.read>) => {
      const result = reader.read(...input)
      if (result.ok) {
        index.open(result.value.location.path)
      }
      return result
    },
    references: (
      path: string,
      offset: number,
      drafts: readonly CodeSource[] = [],
      review: NavigationReview = {},
    ) => symbols(path, offset, drafts, {...review, kind: 'references'}),
    root,
    scan: index.scan,
    scanNavigation: cachedNavigation.scan,
    subscribe: index.subscribe,
    tree: index.tree,
    write: (path: string, source: string, revision: string | null) =>
      writeSource({path, revision, root, source}),
  }
}
