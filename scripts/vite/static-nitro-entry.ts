import type {EnvironmentOptions, Plugin} from 'vite'

export interface StaticNitroEntryPlugin extends Plugin {
  configEnvironment(name: string, config: EnvironmentOptions): void
  load(id: string): string | undefined
  resolveId(id: string): string | undefined
}

/** Replaces Nitro's static build entry with the caller's virtual module ID. */
export const createStaticNitroEntryPlugin = (entryId: string): StaticNitroEntryPlugin => ({
  configEnvironment(name, config) {
    if (name !== 'nitro') {
      return
    }

    config.build ??= {}
    config.build.rolldownOptions ??= {}
    // Nitro 3 beta still builds its server environment after static prerendering.
    config.build.rolldownOptions.input = entryId
  },
  load(id: string) {
    if (id === entryId) {
      return 'export default {}'
    }
  },
  name: 'static-nitro-entry',
  resolveId(id: string) {
    if (id === entryId) {
      return id
    }
  },
})
