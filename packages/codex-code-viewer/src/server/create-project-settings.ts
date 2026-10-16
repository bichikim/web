import {dirname} from 'node:path'
import typescript from '@typescript/typescript6'
interface ProjectSettings {
  readonly directory: string
  readonly options: typescript.CompilerOptions
  readonly cache: typescript.ModuleResolutionCache
}
/** Caches the nearest inherited compiler settings and resolution cache for each file. */
export const createProjectSettings = (system: typescript.System = typescript.sys) => {
  const projects = new Map<string, ProjectSettings>()
  const directories = new Map<string, ProjectSettings>()
  const existence = new Map<string, boolean>()
  const fileExists = (path: string): boolean => {
    if (!existence.has(path)) {
      existence.set(path, system.fileExists(path))
    }
    return existence.get(path) === true
  }
  const read = (file: string): ProjectSettings => {
    const directory = dirname(file)
    const previous = directories.get(directory)
    if (previous !== undefined) {
      return previous
    }
    const configuration = typescript.findConfigFile(directory, fileExists)
    const key = configuration ?? directory
    let settings = projects.get(key)
    if (settings === undefined) {
      const current = configuration === undefined ? directory : dirname(configuration)
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
              typescript.readConfigFile(configuration, system.readFile).config,
              {...system, readDirectory: () => []},
              current,
            ).options
      settings = {
        cache: typescript.createModuleResolutionCache(
          current,
          (path) => (typescript.sys.useCaseSensitiveFileNames ? path : path.toLowerCase()),
          options,
        ),
        directory: current,
        options,
      }
      projects.set(key, settings)
    }
    directories.set(directory, settings)
    return settings
  }
  return {
    clear: () => {
      projects.clear()
      directories.clear()
      existence.clear()
    },
    read,
  }
}
