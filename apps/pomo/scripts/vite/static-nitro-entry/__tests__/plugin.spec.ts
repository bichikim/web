import {describe, expect, it} from 'vitest'
import type {Plugin} from 'vite'

import {staticNitroEntryPlugin} from '../plugin'

interface CallablePlugin {
  readonly configEnvironment: (name: string, config: Record<string, unknown>) => void
  readonly load: (id: string) => string | undefined
  readonly resolveId: (id: string) => string | undefined
}

const plugin = staticNitroEntryPlugin as unknown as CallablePlugin

describe('staticNitroEntryPlugin', () => {
  it('should leave non-Nitro environments unchanged', () => {
    const config = {}

    plugin.configEnvironment('client', config)

    expect(config).toEqual({})
  })

  it('should replace the Nitro build input while preserving its output configuration', () => {
    const config = {
      build: {
        rolldownOptions: {
          output: {entryFileNames: '[name].js'},
        },
      },
    }

    plugin.configEnvironment('nitro', config)

    expect(config).toEqual({
      build: {
        rolldownOptions: {
          input: '\0pomo-static-nitro-entry',
          output: {entryFileNames: '[name].js'},
        },
      },
    })
  })

  it('should initialize missing Nitro build options', () => {
    const config = {}

    plugin.configEnvironment('nitro', config)

    expect(config).toEqual({
      build: {rolldownOptions: {input: '\0pomo-static-nitro-entry'}},
    })
  })

  it('should resolve and load only the static Nitro virtual entry', () => {
    expect(plugin.resolveId('\0pomo-static-nitro-entry')).toBe('\0pomo-static-nitro-entry')
    expect(plugin.resolveId('other-entry')).toBeUndefined()
    expect(plugin.load('\0pomo-static-nitro-entry')).toBe('export default {}')
    expect(plugin.load('other-entry')).toBeUndefined()
  })
})
