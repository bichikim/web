import type {Plugin} from 'vite'

const STATIC_NITRO_ENTRY_ID = '\0pomo-static-nitro-entry'

/** Replaces Nitro's server entry after a static Pomo build has prerendered its routes. */
export const staticNitroEntryPlugin = {
  configEnvironment(name, config) {
    if (name !== 'nitro') {
      return
    }

    config.build ??= {}
    config.build.rolldownOptions ??= {}
    // Nitro 3 beta still builds its server environment after static prerendering.
    config.build.rolldownOptions.input = STATIC_NITRO_ENTRY_ID
  },
  load(id: string) {
    if (id === STATIC_NITRO_ENTRY_ID) {
      return 'export default {}'
    }
  },
  name: 'static-nitro-entry',
  resolveId(id: string) {
    if (id === STATIC_NITRO_ENTRY_ID) {
      return id
    }
  },
} satisfies Plugin
