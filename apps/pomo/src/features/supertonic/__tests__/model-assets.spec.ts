import {describe, expect, it} from 'vitest'

import modelAssetsManifest from '../../../../public/models/supertonic-3/manifest.json'
import {getVoiceStyleUrl, parseInitializationAssets, parseModelAssets} from '../model-assets'

const VOICE_IDS = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'M1',
  'M2',
  'M3',
  'M4',
  'M5',
  'Hana',
  'Mina',
  'Sora',
  'Yuna',
] as const

const createModelAssets = () => ({
  models: {
    supertonic3: {
      revision: '3cadd1e',
      voiceStyles: Object.fromEntries(
        VOICE_IDS.map((voiceId) => [voiceId, {url: `https://assets.example/${voiceId}.json`}]),
      ),
    },
  },
  version: 1,
})

const createInitializationValues = () => ({
  config: {
    ae: {base_chunk_size: 512, sample_rate: 24_000},
    ttl: {chunk_compress_factor: 4, latent_dim: 32},
  },
  indexer: [0, 1],
  modelAssets: createModelAssets(),
})

describe('model assets', () => {
  it('should parse the public Supertonic manifest', () => {
    expect(parseModelAssets(modelAssetsManifest)).toMatchObject({ok: true})
  })

  it('should parse a versioned manifest and resolve a voice style URL', () => {
    const result = parseModelAssets(createModelAssets())

    expect(result.ok).toBe(true)

    if (result.ok) {
      expect(getVoiceStyleUrl(result.value, 'F2')).toBe('https://assets.example/F2.json')
      expect(getVoiceStyleUrl(result.value, 'Hana')).toBe('https://assets.example/Hana.json')
      expect(getVoiceStyleUrl(result.value, 'Mina')).toBe('https://assets.example/Mina.json')
      expect(getVoiceStyleUrl(result.value, 'Sora')).toBe('https://assets.example/Sora.json')
      expect(result.value.models.supertonic3.revision).toBe('3cadd1e')
    }
  })

  it('should reject unsupported versions and missing voice styles', () => {
    const unsupportedVersion = {...createModelAssets(), version: 2}
    const missingVoice = createModelAssets()
    Reflect.deleteProperty(missingVoice.models.supertonic3.voiceStyles, 'F5')

    expect(parseModelAssets(unsupportedVersion)).toMatchObject({
      error: {asset: 'manifest', code: 'invalid-model-data'},
      ok: false,
    })
    expect(parseModelAssets(missingVoice)).toMatchObject({
      error: {asset: 'manifest', code: 'invalid-model-data'},
      ok: false,
    })
  })

  it('should validate every initialization asset as one contract', () => {
    expect(parseInitializationAssets(createInitializationValues())).toMatchObject({ok: true})
    expect(
      parseInitializationAssets({...createInitializationValues(), modelAssets: {version: 1}}),
    ).toMatchObject({error: {asset: 'manifest'}, ok: false})
    expect(parseInitializationAssets({...createInitializationValues(), config: {}})).toMatchObject({
      error: {asset: 'config'},
      ok: false,
    })
    expect(
      parseInitializationAssets({...createInitializationValues(), indexer: ['invalid']}),
    ).toMatchObject({error: {asset: 'indexer'}, ok: false})
  })
})
