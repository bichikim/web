import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {createProjectSettings} from '../create-project-settings'
import {createTimings} from './create-timings'

const documentedImports =
  /\bimport\s*\(\s*['"](?<type>[^'"]+)['"]\s*\)|@import\s+[^\n]*?\bfrom\s*['"](?<tag>[^'"]+)['"]/gu

/** Resolves both module modes and reuses results within the same containing directory. */
export const createImportResolver = (host: typescript.System) => {
  const settings = createProjectSettings(host)
  const modules = new Map<string, readonly string[]>()
  const timings = createTimings()
  let resolutionCalls = 0
  let resolutionHits = 0
  const directConfigs = new Map<string, boolean>()
  const resolveSpecifier = (file: string, specifier: string): readonly string[] => {
    const key = JSON.stringify([dirname(file), specifier])
    const cached = modules.get(key)
    if (cached !== undefined) {
      resolutionHits += 1
      return cached
    }
    const project = settings.read(file)
    const resolved = timings.measure('moduleResolution', () =>
      ([typescript.ModuleKind.ESNext, typescript.ModuleKind.CommonJS] as const).flatMap((mode) => {
        resolutionCalls += 1
        return (
          typescript.resolveModuleName(
            specifier,
            file,
            project.options,
            host,
            project.cache,
            undefined,
            mode,
          ).resolvedModule?.resolvedFileName ?? []
        )
      }),
    )
    modules.set(key, resolved)
    return resolved
  }
  return {
    read: (file: string, text: string): readonly string[] => {
      // Escapes and triple-slash directives still need the compiler scanner.
      if (!/\b(?:import|from|require|define)\b|\/\/\/|\\/u.test(text)) {
        return []
      }
      const info = timings.measure('preprocess', () => typescript.preProcessFile(text, true, true))
      const specifiers = new Set([
        ...info.importedFiles.map((reference) => reference.fileName),
        ...[...text.matchAll(documentedImports)].flatMap(
          (match) => match.groups?.type ?? match.groups?.tag ?? [],
        ),
      ])
      return [
        ...[...specifiers].flatMap((specifier) => resolveSpecifier(file, specifier)),
        ...info.referencedFiles.map((reference) => resolve(dirname(file), reference.fileName)),
      ]
    },
    resolveDirect: (file: string, specifier: string): readonly string[] => {
      const directory = dirname(file)
      if (!directConfigs.has(directory)) {
        directConfigs.set(
          directory,
          typescript.findConfigFile(directory, host.fileExists, 'jsconfig.json') === undefined,
        )
      }
      // The shared settings reader handles tsconfig; leave jsconfig identities to TS7.
      return directConfigs.get(directory) === true ? resolveSpecifier(file, specifier) : []
    },
    statistics: () => ({importTimings: timings.read(), resolutionCalls, resolutionHits}),
  }
}
