import {resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {createSourceSnapshots} from './create-source-snapshots'
import {createReferenceScope} from './create-reference-scope'
import {scanProjectReferences} from './scan-project-references'
import {createNavigationModules} from './create-navigation-modules'
import {createNavigationFileSystem} from './create-navigation-file-system'
import {collectModuleBindingReferences} from './collect-module-binding-references'
// TypeScript's runtime forwards this compiler-host hook from the language-service host.
interface NavigationHost extends typescript.LanguageServiceHost {
  readonly hasInvalidatedResolutions: (file: typescript.Path) => boolean
}
interface ReferenceLookup {
  readonly candidates?: readonly string[]
  readonly cancelled?: () => boolean
  readonly complete?: boolean
}
const snapshotText = (snapshot: typescript.IScriptSnapshot | undefined): string | undefined =>
  snapshot?.getText(0, snapshot.getLength())
const navigationSettings = (options: typescript.CompilerOptions): typescript.CompilerOptions => ({
  ...options,
  // Navigation includes JavaScript even when the project's build excludes it.
  allowJs: true,
  jsx: options.jsx ?? typescript.JsxEmit.Preserve,
})
const collectReferences = (
  service: typescript.LanguageService,
  file: string,
  offset: number,
  cancelled?: () => boolean,
) => [
  ...(service.findReferences(file, offset) ?? []).flatMap((symbol) =>
    symbol.references.filter((reference) => reference.isDefinition !== true),
  ),
  ...collectModuleBindingReferences({
    cancelled,
    file,
    offset,
    program: service.getProgram(),
    references: (path, position) => service.findReferences(path, position) ?? [],
  }),
]

export const createLanguageService = (
  path: string,
  sources: ReadonlyMap<string, string> = new Map(),
  registry: typescript.DocumentRegistry = typescript.createDocumentRegistry(),
  root?: string,
) => {
  const filesystem = createNavigationFileSystem()
  const snapshots = createSourceSnapshots(sources, filesystem)
  const inputs = new Set<string>()
  const modules = createNavigationModules({
    filesystem,
    path,
    read: (file) => {
      inputs.add(file)
      return snapshotText(snapshots.read(file))
    },
    root,
  })
  const {directory, options} = modules
  let files = new Set([path])
  let version = 0
  let resolutionsChanged = false
  let cancelled: (() => boolean) | undefined
  const invalidate = (): void => {
    version += 1
    resolutionsChanged = true
    modules.clear()
    scope.clear()
  }
  const refresh = (): void => {
    modules.filesystem.clear()
    if (snapshots.refresh()) {
      invalidate()
    }
  }
  const scope = createReferenceScope({
    options: {...options, allowJs: true},
    read: (file) => snapshotText(snapshots.read(file)),
    resolveModule: modules.candidates,
  })
  const prepare = (paths: readonly string[]): void => {
    const next = new Set(paths.map((file) => resolve(file)))
    if (files.size !== next.size || [...files].some((file) => !next.has(file))) {
      files = next
      version += 1
    }
  }
  const host: NavigationHost = {
    ...modules.filesystem.host,
    getCancellationToken: () => ({
      isCancellationRequested: () => cancelled?.() === true,
      throwIfCancellationRequested: () => {
        if (cancelled?.() === true) {
          throw new typescript.OperationCanceledException()
        }
      },
    }),
    getCompilationSettings: () => navigationSettings(options),
    getCurrentDirectory: () => directory,
    getDefaultLibFileName: (settings) => typescript.getDefaultLibFilePath(settings),
    getProjectVersion: () => String(version),
    getScriptFileNames: () => [...files],
    getScriptSnapshot: snapshots.read,
    getScriptVersion: snapshots.version,
    hasInvalidatedResolutions: (file) => resolutionsChanged || modules.invalidated(file),
    resolveModuleNameLiterals: modules.literals,
    useCaseSensitiveFileNames: () => typescript.sys.useCaseSensitiveFileNames,
  }
  const service = typescript.createLanguageService(host, registry)
  const withCancellation = <T>(cancellation: (() => boolean) | undefined, run: () => T): T => {
    cancelled = cancellation
    refresh()
    try {
      return run()
    } finally {
      cancelled = undefined
      resolutionsChanged = false
      modules.complete()
    }
  }
  return {
    definitions: (file: string, offset: number, cancellation?: () => boolean) =>
      withCancellation(cancellation, () => {
        prepare([...files, resolve(file)])
        return service.getDefinitionAtPosition(file, offset) ?? []
      }),
    dispose: () => {
      service.dispose()
      snapshots.dispose()
    },
    references: (
      file: string,
      offset: number,
      projectFiles: readonly string[],
      lookup: ReferenceLookup = {},
    ) =>
      withCancellation(lookup.cancelled, () => {
        const paths = [resolve(file), ...projectFiles.map((entry) => resolve(entry))]
        modules.update(paths)
        prepare(lookup.complete === false ? paths : scope(resolve(file), paths, lookup.cancelled))
        return collectReferences(service, file, offset, lookup.cancelled)
      }),
    resolutionInputs: () => snapshots.checkpoint(inputs),
    resolveModule: (file: string, specifier: string) => {
      modules.filesystem.clear()
      return modules.resolve(file, specifier).resolvedModule?.resolvedFileName
    },
    scanReferences: async function* (
      file: string,
      offset: number,
      projectFiles: readonly string[],
      lookup: ReferenceLookup = {},
    ) {
      const {cancelled: cancellation} = lookup
      cancelled = cancellation
      refresh()
      const paths = [resolve(file), ...projectFiles.map((entry) => resolve(entry))]
      modules.update(paths)
      try {
        // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
        yield* scanProjectReferences({
          cancelled: cancellation,
          candidates: lookup.candidates,
          complete: lookup.complete !== false,
          file: resolve(file),
          offset,
          paths,
          preload: snapshots.prepare,
          prepare,
          read: (path) => snapshotText(snapshots.read(path)),
          retained: [...files],
          scope,
          service,
        })
      } finally {
        cancelled = undefined
        resolutionsChanged = false
        modules.complete()
      }
    },
    warm: (file: string, cancellation?: () => boolean): void =>
      withCancellation(cancellation, () => {
        if (cancellation?.() === true) {
          throw new typescript.OperationCanceledException()
        }
        prepare([...files, resolve(file)])
        service.getProgram()?.getTypeChecker()
      }),
  }
}
