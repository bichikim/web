import {createSourceSynchronization} from './create-source-synchronization'
import {createProjectLanguages} from './create-project-languages'
import {createWorkspaceSymbols} from './create-workspace-symbols'
import {realpathSync, statSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {homedir} from 'node:os'
import {createPathNavigation} from './create-path-navigation'
import {type CodeSource, type WorkspaceEntry, type WorkspaceTree} from '../shared/contracts'
import {writeSource} from './write-source'
import {createEntry} from './create-entry'
import {createFileOperations} from './file-operations'
import {createSyntaxNavigation} from './create-syntax-navigation'
import {fileFormat} from '../shared/file-formats'
import {findWorkspace} from './file-access'
import {createDocumentReader} from './create-document-reader'
import {createFileIndex, type FileIndex} from './create-file-index'
import {readMedia} from './read-media'
import {createNavigationWorker} from './create-navigation-worker'
import {createNavigationStream, type SymbolLookupOptions} from './create-navigation-stream'
import {
  createNavigationCache,
  createNavigationIndex,
  createSourceIndexStore,
  type NavigationCheckpoint,
  type NavigationReview,
} from './navigation-cache'
import {observeNavigationConfiguration} from './observe-navigation-configuration'
import type {DefinitionLookup, ReferenceLookup} from './types'
import {createNativeSymbols} from './native/create-native-symbols'
import {isSupportedSource} from './native/is-supported-source'
import {createWorkerSymbols} from './create-worker-symbols'

const navigationStorageDirectory = (): string =>
  join(
    process.env.CODEX_HOME || join(homedir(), '.codex'),
    'cache',
    'codex-code-viewer',
    'navigation',
  )

const createOpenedReader =
  (reader: ReturnType<typeof createDocumentReader>, index: Pick<FileIndex, 'open'>) =>
  (...input: Parameters<typeof reader.read>) => {
    const result = reader.read(...input)
    if (result.ok) {
      index.open(result.value.location.path)
    }
    return result
  }

interface WarmNavigationOptions {
  readonly busy?: () => boolean
  readonly checkpoint?: (signal: AbortSignal) => Promise<NavigationCheckpoint>
  readonly prepare: (path: string, discovery?: WorkspaceTree) => Promise<boolean>
  readonly refresh: () => void
  readonly signal: AbortSignal
}
const createWarmNavigation =
  ({busy, checkpoint, prepare, refresh, signal}: WarmNavigationOptions) =>
  async (path: string): Promise<boolean> => {
    if (!isSupportedSource(path) || signal.aborted || busy?.() === true) {
      return false
    }
    refresh()
    try {
      const snapshot = await checkpoint?.(signal)
      signal.throwIfAborted()
      return await prepare(path, snapshot?.discovery)
    } catch {
      return false
    }
  }

interface WorkspacePreparationOptions {
  readonly discover: () => Promise<NavigationCheckpoint>
  readonly prepare: (path: string) => Promise<boolean>
  readonly signal: AbortSignal
}
const startWorkspacePreparation = ({
  discover,
  prepare,
  signal,
}: WorkspacePreparationOptions): Promise<boolean> =>
  discover()
    .then((listing) => {
      const source = listing.discovery?.files.find((file) => isSupportedSource(file.path))
      if (signal.aborted || source === undefined) {
        return false
      }
      return prepare(source.path)
    })
    .catch(() => false)

interface WorkspaceScanOptions {
  readonly background: Pick<
    ReturnType<typeof createNavigationWorker>,
    'prioritize' | 'changed' | 'start'
  >
  readonly cache: ReturnType<typeof createNavigationCache>
  readonly reset: () => void
}
const createWorkspaceScan = ({background, cache, reset}: WorkspaceScanOptions) =>
  async function* createWorkspaceScan(...input: Parameters<typeof cache.scan>) {
    const release = background.prioritize()
    try {
      if (fileFormat(input[0].path)?.kind === 'code') {
        background.start()
      } else if (await background.changed(input[1])) {
        reset()
        cache.clear()
      }
      // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
      yield* cache.scan(...input)
    } finally {
      release()
    }
  }

export const createWorkspace = (anchor: string, options: {readonly worker?: boolean} = {}) => {
  const canonical = realpathSync(anchor)
  const root = statSync(canonical).isDirectory() ? canonical : findWorkspace(canonical)
  const languages = createProjectLanguages(root)
  const navigation = createSyntaxNavigation(root)
  const index = createFileIndex(root)
  const reader = createDocumentReader(root)
  const native = options.worker === true ? createNativeSymbols(root) : undefined
  const background = createNavigationWorker(root, languages.project)
  const configuration = observeNavigationConfiguration(index, {
    background,
    languages,
    navigation,
  })
  const lifetime = new AbortController()
  const navigationIndex = createNavigationIndex({
    changes: index,
    onConfigurationChange: configuration.reset,
    root,
    storage: createSourceIndexStore({
      directory: navigationStorageDirectory(),
      root,
    }),
  })
  const synchronization = createSourceSynchronization({
    onConfigurationChange: configuration.reset,
    onSourcesChange: navigation.update,
    root,
  })
  const prepare = async (path: string, signal: AbortSignal): Promise<void> => {
    const format = fileFormat(path)
    if (format?.kind === 'syntax' && navigation.has(format.language)) {
      await synchronization.refresh(format.language, AbortSignal.any([signal, lifetime.signal]))
    }
  }
  const symbols = createWorkspaceSymbols({
    code:
      native?.query ??
      createWorkerSymbols({background, read: reader.read, signal: lifetime.signal}),
    navigation,
    prepare,
    refresh: configuration.refresh,
    root,
    signal: lifetime.signal,
  })
  const followPath = createPathNavigation({
    hasAnalyzer: navigation.has,
    refresh: configuration.refresh,
    resolveModule: (path, specifier) =>
      languages.get(path).resolveModule(resolve(root, path), specifier),
    root,
    symbols,
  })
  const cachedNavigation = createNavigationCache({
    index: navigationIndex,
    read: reader.read,
    scan: createNavigationStream({
      background,
      followPath,
      prepare,
      read: reader.read,
      root,
      symbols,
    }),
    semanticInputs: background.inputs,
  })
  const warmNavigation = createWarmNavigation({
    busy: native === undefined ? background.busy : undefined,
    checkpoint: native === undefined ? navigationIndex.checkpoint : undefined,
    prepare: native?.warm ?? background.warm,
    refresh: configuration.refresh,
    signal: lifetime.signal,
  })
  const preparing =
    options.worker === true
      ? undefined
      : startWorkspacePreparation({
          discover: () => navigationIndex.checkpoint(lifetime.signal),
          prepare: warmNavigation,
          signal: lifetime.signal,
        })
  return {
    create: (parent: string, name: string, kind: WorkspaceEntry['kind']) =>
      createEntry({kind, name, parent, root}),
    definitions: (
      path: string,
      offset: number,
      drafts: readonly CodeSource[] = [],
      lookup?: DefinitionLookup,
    ) =>
      symbols(path, offset, drafts, {
        ...(typeof lookup === 'function' ? {cancelled: lookup} : lookup),
        kind: 'definition',
      }),
    directFunctionReferences: true,
    dispose: () => {
      lifetime.abort()
      configuration.dispose()
      synchronization.dispose()
      cachedNavigation.dispose()
      background.dispose()
      index.dispose()
      reader.dispose()
      languages.dispose()
      navigation.dispose()
      native?.dispose()
    },
    followPath,
    list: index.list,
    media: (path: string, revision: string, offset: number) =>
      readMedia({offset, path, revision, root}),
    observe: index.observe,
    operations: createFileOperations(root),
    prepareNavigation: (path: string, cancelled?: () => boolean): void => {
      configuration.refresh()
      if (cancelled?.() !== true) {
        warmNavigation(path)
      }
    },
    prepareWorkspace: (discovery?: WorkspaceTree): Promise<boolean> =>
      native?.prepare(discovery) ?? preparing ?? Promise.resolve(false),
    prioritizeNavigation: native?.prioritize,
    read: createOpenedReader(reader, index),
    references: (
      path: string,
      offset: number,
      drafts: readonly CodeSource[] = [],
      review: ReferenceLookup = {},
    ) => symbols(path, offset, drafts, {...review, kind: 'references'}),
    resolutionInputs: native?.inputs ?? languages.resolutionInputs,
    root,
    scan: index.scan,
    scanNavigation: createWorkspaceScan({
      background,
      cache: cachedNavigation,
      reset: configuration.reset,
    }),
    seedNavigation: native?.seed,
    subscribe: index.subscribe,
    tree: index.tree,
    warmNavigation,
    write: (path: string, source: string, revision: string | null) =>
      writeSource({path, revision, root, source}),
  }
}
