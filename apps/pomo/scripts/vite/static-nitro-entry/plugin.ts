import {createStaticNitroEntryPlugin} from '../../../../../scripts/vite/static-nitro-entry'

/** Pomo's static entry instance, shared by the application and its SSR fixture. */
export const staticNitroEntryPlugin = createStaticNitroEntryPlugin('\0pomo-static-nitro-entry')
