import {createHash} from 'node:crypto'
import {dirname, resolve} from 'node:path'
import typescript from '@typescript/typescript6'
import {createLanguageService} from './create-language-service'

interface DraftLanguage {
  readonly key: string
  readonly service: ReturnType<typeof createLanguageService>
}
/** Reuses saved and current draft project contexts and releases them with the workspace. */
export const createProjectLanguages = (root: string) => {
  const services = new Map<string, ReturnType<typeof createLanguageService>>()
  const drafts = new Map<string, DraftLanguage>()
  const registry = typescript.createDocumentRegistry()
  const project = (path: string): string => {
    const file = resolve(root, path)
    return typescript.findConfigFile(dirname(file), typescript.sys.fileExists) ?? dirname(file)
  }
  return {
    dispose: () => {
      for (const service of services.values()) {
        service.dispose()
      }
      for (const draft of drafts.values()) {
        draft.service.dispose()
      }
      services.clear()
      drafts.clear()
    },
    get: (
      path: string,
      sources: ReadonlyMap<string, string> = new Map(),
    ): ReturnType<typeof createLanguageService> => {
      const file = resolve(root, path)
      const key = project(path)
      if (sources.size > 0) {
        const revision = createHash('sha256')
          .update(JSON.stringify([...sources].sort(([left], [right]) => left.localeCompare(right))))
          .digest('hex')
        const previous = drafts.get(key)
        if (previous?.key === revision) {
          return previous.service
        }
        previous?.service.dispose()
        const service = createLanguageService(file, sources, registry, root)
        drafts.set(key, {key: revision, service})
        return service
      }
      const existing = services.get(key)
      if (existing !== undefined) {
        return existing
      }
      const service = createLanguageService(file, sources, registry, root)
      services.set(key, service)
      return service
    },
    project,
    resolutionInputs: () =>
      new Map(
        [...services.values(), ...[...drafts.values()].map((draft) => draft.service)].flatMap(
          (service) => [...service.resolutionInputs()],
        ),
      ),
  }
}
