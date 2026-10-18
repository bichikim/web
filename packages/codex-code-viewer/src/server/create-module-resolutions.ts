import {sep} from 'node:path'
import typescript from '@typescript/typescript6'
interface ModuleResolution extends typescript.ResolvedModuleWithFailedLookupLocations {
  readonly workspaceDeclaration?: boolean
  readonly failedLookupLocations?: readonly string[]
}
interface ResolutionRequest {
  readonly file: string
  readonly specifier: string
  readonly mode?: typescript.ResolutionMode
  readonly redirected?: string
  readonly cache: typescript.ModuleResolutionCache
  readonly resolve: () => ModuleResolution
}
interface CachedResolution {
  readonly file: string
  readonly cache: typescript.ModuleResolutionCache
  readonly result: ModuleResolution
}
const canonical = (path: string): string =>
  (typescript.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()).split(sep).join('/')
/** Retains module resolutions and invalidates lookups affected by newly discovered file paths. */
export const createModuleResolutions = () => {
  const resolutions = new Map<string, CachedResolution>()
  const invalidated = new Set<string>()
  let files = new Set<string>()
  return {
    clear: () => {
      resolutions.clear()
      invalidated.clear()
    },
    complete: () => invalidated.clear(),
    invalidated: (file: string): boolean => invalidated.has(canonical(file)),
    read: (request: ResolutionRequest): ModuleResolution => {
      const key = JSON.stringify([
        request.file,
        request.specifier,
        request.mode,
        request.redirected,
      ])
      const previous = resolutions.get(key)
      if (previous !== undefined) {
        return previous.result
      }
      const result = request.resolve()
      resolutions.set(key, {cache: request.cache, file: request.file, result})
      return result
    },
    update: (paths: readonly string[]): boolean => {
      invalidated.clear()
      const current = new Set(paths.map(canonical))
      const added = [...current].filter((path) => !files.has(path))
      files = current
      if (added.length === 0) {
        return false
      }
      const discovered = new Set(added)
      for (const [key, previous] of resolutions) {
        // Failed probes also identify higher-priority sources that can replace a JavaScript target.
        const lookups = previous.result.failedLookupLocations
        const affected =
          previous.result.workspaceDeclaration === true ||
          (lookups === undefined
            ? previous.result.resolvedModule === undefined
            : lookups.some((path) => discovered.has(canonical(path))))
        if (affected) {
          invalidated.add(canonical(previous.file))
          previous.cache.clear()
          resolutions.delete(key)
        }
      }
      return true
    },
  }
}
