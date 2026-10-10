import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {createLanguageService} from './create-language-service'

/** Reuses TypeScript language services per project and releases them with the workspace. */
export const createProjectLanguages = (root: string) => {
  const services = new Map<string, ReturnType<typeof createLanguageService>>()
  return {
    dispose: () => {
      for (const service of services.values()) {
        service.dispose()
      }
      services.clear()
    },
    get: (path: string): ReturnType<typeof createLanguageService> => {
      const file = resolve(root, path)
      const directory = dirname(file)
      const configuration = typescript.findConfigFile(directory, typescript.sys.fileExists)
      const key = configuration ?? directory
      const existing = services.get(key)
      if (existing !== undefined) {
        return existing
      }
      const service = createLanguageService(file)
      services.set(key, service)
      return service
    },
  }
}
