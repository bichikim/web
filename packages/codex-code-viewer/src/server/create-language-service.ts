import {statSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'

export const createLanguageService = (
  path: string,
  sources: ReadonlyMap<string, string> = new Map(),
) => {
  const configuration = typescript.findConfigFile(dirname(path), typescript.sys.fileExists)
  const options =
    configuration === undefined
      ? {
          allowJs: true,
          jsx: typescript.JsxEmit.Preserve,
          module: typescript.ModuleKind.ESNext,
          moduleResolution: typescript.ModuleResolutionKind.Bundler,
          target: typescript.ScriptTarget.Latest,
        }
      : typescript.parseJsonConfigFileContent(
          typescript.readConfigFile(configuration, typescript.sys.readFile).config,
          typescript.sys,
          dirname(configuration),
        ).options
  let files = new Set([path])
  let version = 0
  const service = typescript.createLanguageService({
    ...typescript.sys,
    // Navigation includes JavaScript even when the project's build excludes it.
    getCompilationSettings: () => ({
      ...options,
      allowJs: true,
      jsx: options.jsx ?? typescript.JsxEmit.Preserve,
    }),
    getCurrentDirectory: () =>
      configuration === undefined ? dirname(path) : dirname(configuration),
    getDefaultLibFileName: (settings) => typescript.getDefaultLibFilePath(settings),
    getProjectVersion: () => String(version),
    getScriptFileNames: () => [...files],
    getScriptSnapshot: (file) => {
      const text = sources.get(resolve(file)) ?? typescript.sys.readFile(file)
      return text === undefined ? undefined : typescript.ScriptSnapshot.fromString(text)
    },
    getScriptVersion: (file) => {
      try {
        const stats = statSync(file)
        return `${stats.mtimeMs}:${stats.size}`
      } catch {
        return 'missing'
      }
    },
    useCaseSensitiveFileNames: () => typescript.sys.useCaseSensitiveFileNames,
  })
  return {
    definitions: (file: string, offset: number) => {
      files.add(resolve(file))
      version += 1
      return service.getDefinitionAtPosition(file, offset) ?? []
    },
    dispose: () => service.dispose(),
    references: (file: string, offset: number, projectFiles: readonly string[]) => {
      files = new Set([resolve(file), ...projectFiles.map((entry) => resolve(entry))])
      version += 1
      return (service.findReferences(file, offset) ?? []).flatMap((symbol) =>
        symbol.references.filter((reference) => reference.isDefinition !== true),
      )
    },
    resolveModule: (file: string, specifier: string) =>
      typescript.resolveModuleName(specifier, file, options, typescript.sys).resolvedModule
        ?.resolvedFileName,
  }
}
