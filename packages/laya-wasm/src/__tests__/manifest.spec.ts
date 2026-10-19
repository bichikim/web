import {expect, it} from 'vitest'
import {parameterLayout, parseManifest} from '../index'

const manifest = {
  config: {head_max_len: 32, max_len: 80, temperature: [1, 1, 1]},
  externalData: ['model.data'],
  featureOutput: 'features',
  modelId: 'base',
  parameters: parameterLayout(2),
  version: 1,
  width: 2,
}

it('should reject invalid temperatures and unsupported parameter layouts', () => {
  expect(() =>
    parseManifest({...manifest, config: {...manifest.config, temperature: [1, 0, 1]}}),
  ).toThrow(/Temperatures/)
  expect(() => parseManifest({...manifest, parameters: []})).toThrow(/layout/)
})

it('should reject external data paths escaping the model bundle', () => {
  expect(() => parseManifest({...manifest, externalData: ['../weights.bin']})).toThrow(/relative/)
  expect(() => parseManifest({...manifest, externalData: ['https://example.com/weights']})).toThrow(
    /relative/,
  )
})

it('should accept optional calibration buckets without depending on object property order', () => {
  const parameters = manifest.parameters.map((item) =>
    Object.fromEntries([
      ['dimensions', item.dimensions],
      ['name', item.name],
    ]),
  )
  expect(parseManifest({...manifest, parameters}).config.optionTemperatures).toEqual({})
})
