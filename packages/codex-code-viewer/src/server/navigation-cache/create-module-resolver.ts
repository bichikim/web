import {dirname, relative, resolve, sep} from 'node:path'
import typescript from '@typescript/typescript6'
import {fileFormat} from '../../shared/file-formats'
import type {FileSummary, IndexedSource} from './types'
interface ProjectResolution {
  readonly compiler: typescript.CompilerOptions
  readonly cache: typescript.ModuleResolutionCache
}

/** Resolves cached module specifiers with the current project compiler settings. */
export const createModuleResolver = (root: string, sources: ReadonlyMap<string, IndexedSource>) => {
  const settings = new Map<string, ProjectResolution>()
  const directories = new Map<string, ProjectResolution>()
  const project = (directory: string): ProjectResolution => {
    const known = directories.get(directory)
    if (known !== undefined) {
      return known
    }
    const config = typescript.findConfigFile(directory, typescript.sys.fileExists)
    const key = config ?? directory
    let resolved = settings.get(key)
    if (resolved === undefined) {
      const compiler =
        config === undefined
          ? {allowJs: true, moduleResolution: typescript.ModuleResolutionKind.Bundler}
          : typescript.parseJsonConfigFileContent(
              typescript.readConfigFile(config, typescript.sys.readFile).config,
              {...typescript.sys, readDirectory: () => []},
              dirname(config),
            ).options
      resolved = {
        cache: typescript.createModuleResolutionCache(
          root,
          (path) => (typescript.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()),
          compiler,
        ),
        compiler,
      }
      settings.set(key, resolved)
    }
    directories.set(directory, resolved)
    return resolved
  }
  return (path: string, source: IndexedSource): FileSummary => {
    const {compiler, cache} = project(dirname(resolve(root, path)))
    let uncertain = source.summary.uncertain || fileFormat(path)?.kind !== 'code'
    const dependencies = source.summary.imports.flatMap((specifier) => {
      const target = typescript.resolveModuleName(
        specifier,
        resolve(root, path),
        compiler,
        typescript.sys,
        cache,
      ).resolvedModule
      if (target === undefined) {
        uncertain = true
        return []
      }
      const normalized = relative(root, target.resolvedFileName).split(sep).join('/')
      return sources.has(normalized) ? [normalized] : []
    })
    return {
      dependencies,
      fingerprint: JSON.stringify([source.summary.fingerprint, dependencies, uncertain]),
      names: source.summary.names,
      surface: source.summary.surface,
      uncertain,
    }
  }
}
