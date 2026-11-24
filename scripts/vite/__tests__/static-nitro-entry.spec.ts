/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createStaticNitroEntryPlugin} from '../static-nitro-entry'

const consumers = [
  {app: 'Pomo', entryId: '\0pomo-static-nitro-entry'},
  {app: 'AI Director', entryId: '\0ai-director-static-entry'},
] as const

describe.each(consumers)('$app static Nitro entry', ({entryId}) => {
  const plugin = createStaticNitroEntryPlugin(entryId)

  it.each(['client', 'ssr'])('should leave the %s environment unchanged', (environment) => {
    const config = {build: {rolldownOptions: {input: 'original'}}}

    plugin.configEnvironment(environment, config)

    expect(config).toEqual({build: {rolldownOptions: {input: 'original'}}})
  })

  it('should replace the Nitro input while preserving existing configuration and identity', () => {
    const output = {entryFileNames: '[name].js'}
    const rolldownOptions = {input: 'original', output}
    const build = {rolldownOptions, sourcemap: true}
    const config = {build}

    plugin.configEnvironment('nitro', config)

    expect(config.build).toBe(build)
    expect(build.rolldownOptions).toBe(rolldownOptions)
    expect(rolldownOptions.output).toBe(output)
    expect(config).toEqual({build: {rolldownOptions: {input: entryId, output}, sourcemap: true}})
  })

  it.each([{}, {build: {}}])('should initialize missing Nitro build options in %j', (config) => {
    plugin.configEnvironment('nitro', config)

    expect(config).toEqual({build: {rolldownOptions: {input: entryId}}})
  })

  it('should resolve and load only the configured virtual entry', () => {
    expect(plugin.resolveId(entryId)).toBe(entryId)
    expect(plugin.load(entryId)).toBe('export default {}')
    for (const unrelated of ['other-entry', ...consumers.map((consumer) => consumer.entryId)]) {
      if (unrelated !== entryId) {
        expect(plugin.resolveId(unrelated)).toBeUndefined()
        expect(plugin.load(unrelated)).toBeUndefined()
      }
    }
  })

  it('should preserve the configured build objects across repeated calls', () => {
    const config = {build: {rolldownOptions: {input: 'original'}}}
    plugin.configEnvironment('nitro', config)
    const build = config.build
    const rolldownOptions = build.rolldownOptions

    plugin.configEnvironment('nitro', config)

    expect(config.build).toBe(build)
    expect(config.build.rolldownOptions).toBe(rolldownOptions)
    expect(rolldownOptions.input).toBe(entryId)
  })
})

it('should keep each consumer entry independent when both plugins exist', () => {
  const pomo = createStaticNitroEntryPlugin(consumers[0].entryId)
  const director = createStaticNitroEntryPlugin(consumers[1].entryId)

  expect(pomo.resolveId(consumers[0].entryId)).toBe(consumers[0].entryId)
  expect(director.resolveId(consumers[1].entryId)).toBe(consumers[1].entryId)
  expect(pomo.load(consumers[1].entryId)).toBeUndefined()
  expect(director.load(consumers[0].entryId)).toBeUndefined()
})
