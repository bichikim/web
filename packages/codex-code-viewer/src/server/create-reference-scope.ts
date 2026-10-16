import {realpathSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {resolveModuleCandidates} from './resolve-module-candidates'

interface ReferenceScopeOptions {
  readonly options: typescript.CompilerOptions
  readonly read: (path: string) => string | undefined
  readonly resolveModule?: (path: string, specifier: string) => readonly string[]
}
interface SourceModule {
  readonly source: string
  readonly imports: readonly string[]
  readonly ambient: boolean
}
interface ModuleGraph {
  readonly edges: ReadonlyMap<string, ReadonlySet<string>>
  readonly external: boolean
}
interface ReferenceResolution {
  readonly path: string
  readonly imports: readonly string[]
  readonly options: typescript.CompilerOptions
  readonly cache: typescript.ModuleResolutionCache
  readonly resolution?: (path: string, specifier: string) => readonly string[]
}
const throwIfCancelled = (cancelled?: () => boolean): void => {
  if (cancelled?.() === true) {
    throw new typescript.OperationCanceledException()
  }
}
const resolveImports = ({
  path,
  imports,
  options,
  cache,
  resolution,
}: ReferenceResolution): string[] =>
  imports.flatMap((specifier) => {
    const dependencies =
      resolution?.(path, specifier) ?? resolveModuleCandidates({cache, options, path, specifier})
    return dependencies.length === 0
      ? [resolve(dirname(path), specifier)]
      : [...new Set(dependencies)]
  })
const canonicalPath = (path: string): string => {
  try {
    return realpathSync(path)
  } catch {
    return path
  }
}
const readModule = (path: string, source: string, previous?: SourceModule): SourceModule => {
  if (previous?.source === source) {
    return previous
  }
  const info = typescript.preProcessFile(source, true, true)
  const syntax = typescript.createSourceFile(path, source, typescript.ScriptTarget.Latest)
  // Preprocessing omits JSDoc imports; extra matches only widen the semantic search.
  const documented =
    /\bimport\s*\(\s*['"](?<type>[^'"]+)['"]\s*\)|@import\s+[^\n]*?\bfrom\s*['"](?<tag>[^'"]+)['"]/gu
  return {
    ambient:
      !typescript.isExternalModule(syntax) ||
      syntax.statements.some(
        (statement) =>
          typescript.isModuleDeclaration(statement) &&
          (statement.name.text === 'global' || typescript.isStringLiteral(statement.name)),
      ),
    imports: [
      ...[...info.importedFiles, ...info.referencedFiles].map((item) => item.fileName),
      ...[...source.matchAll(documented)].flatMap(
        (match) => match.groups?.type ?? match.groups?.tag ?? [],
      ),
    ],
    source,
  }
}
const hasExternalImports = (
  path: string,
  entry: SourceModule,
  candidates: ReadonlySet<string>,
  {options, resolution}: Pick<ReferenceResolution, 'options' | 'resolution'>,
): boolean => {
  if (entry.imports.length === 0) {
    return false
  }
  const cache = typescript.createModuleResolutionCache(
    typescript.sys.getCurrentDirectory(),
    (file) => file,
    options,
  )
  return resolveImports({cache, imports: entry.imports, options, path, resolution}).some(
    (dependency) => !candidates.has(dependency) && !candidates.has(canonicalPath(dependency)),
  )
}
const moduleGraph = (
  modules: ReadonlyMap<string, SourceModule>,
  options: typescript.CompilerOptions,
  cancelled?: () => boolean,
  resolution?: ReferenceResolution['resolution'],
): ModuleGraph => {
  const canonical = new Map([...modules.keys()].map((path) => [canonicalPath(path), path]))
  const graph = new Map<string, Set<string>>()
  const resolver = typescript.createModuleResolutionCache(
    typescript.sys.getCurrentDirectory(),
    (path) => path,
    options,
  )
  for (const [path, entry] of modules) {
    throwIfCancelled(cancelled)
    const edges = graph.get(path) ?? new Set<string>()
    graph.set(path, edges)
    for (const dependency of resolveImports({
      cache: resolver,
      imports: entry.imports,
      options,
      path,
      resolution,
    })) {
      const resolved = canonicalPath(dependency)
      const actual = canonical.get(resolved) ?? resolved
      if (!modules.has(actual)) {
        return {edges: graph, external: true}
      }
      edges.add(actual)
      const reverse = graph.get(actual) ?? new Set<string>()
      reverse.add(path)
      graph.set(actual, reverse)
    }
  }
  return {edges: graph, external: false}
}
/** Selects connected modules and ambient sources, retaining all files for global or unreadable queries. */
export const createReferenceScope = ({options, read, resolveModule}: ReferenceScopeOptions) => {
  const modules = new Map<string, SourceModule>()
  let graph: ReturnType<typeof moduleGraph> | undefined
  const requiresFullContext = (
    path: string,
    entry: SourceModule | undefined,
    candidates: ReadonlySet<string>,
  ): boolean =>
    resolveModule !== undefined &&
    entry !== undefined &&
    hasExternalImports(path, entry, candidates, {options, resolution: resolveModule})
  const select = (file: string, paths: readonly string[], cancelled?: () => boolean): string[] => {
    const candidates = new Set(paths.map((path) => resolve(path)))
    throwIfCancelled(cancelled)
    const query = read(file)
    if (query !== undefined) {
      const module = readModule(file, query, modules.get(file))
      // Skip graph construction when the selected module already requires the full project context.
      if (
        module.ambient ||
        hasExternalImports(file, module, candidates, {options, resolution: resolveModule})
      ) {
        return [...candidates]
      }
    }
    let changed = modules.size !== candidates.size
    let incomplete = false
    for (const path of modules.keys()) {
      if (!candidates.has(path)) {
        modules.delete(path)
        graph = undefined
        changed = true
      }
    }
    for (const path of candidates) {
      throwIfCancelled(cancelled)
      const source = read(path)
      if (source === undefined) {
        incomplete = true
      } else if (modules.get(path)?.source !== source) {
        graph = undefined
        modules.set(path, readModule(path, source))
        changed = true
      }
      // The complete-root fallback no longer needs the remaining source summaries.
      if (requiresFullContext(path, modules.get(path), candidates)) {
        return [...candidates]
      }
    }
    if (incomplete || modules.get(file)?.ambient !== false) {
      return [...candidates]
    }
    if (changed || graph === undefined) {
      graph = moduleGraph(modules, options, cancelled, resolveModule)
    }
    const current = graph
    // External declarations can relate otherwise disconnected local callers through inherited members or reexports.
    if (current.external) {
      return [...candidates]
    }
    const selected = new Set([file])
    for (const path of selected) {
      current.edges.get(path)?.forEach((dependency) => selected.add(dependency))
    }
    if ([...selected].some((path) => modules.get(path)?.ambient === true)) {
      return [...candidates]
    }
    return [...candidates].filter(
      (path) => selected.has(path) || modules.get(path)?.ambient === true,
    )
  }
  return Object.assign(select, {
    clear: (): void => {
      graph = undefined
    },
  })
}
