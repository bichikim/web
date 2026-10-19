import {expect, it} from 'vitest'
import {DEFAULT_POFFO_VOICE, poffoVoiceSchema} from '../voice'

it('should preserve existing local voice settings when loading settings without a provider', () => {
  const {provider: _, ...legacy} = DEFAULT_POFFO_VOICE
  expect(poffoVoiceSchema.parse({...legacy, voice: 'Hana'})).toEqual({
    ...DEFAULT_POFFO_VOICE,
    provider: 'local',
    voice: 'Hana',
  })
})
it('should migrate Codex selection to ChatGPT settings without discarding the local configuration', () => {
  const value = {...DEFAULT_POFFO_VOICE, model: 'full', provider: 'codex', voice: 'Hana'}
  expect(poffoVoiceSchema.parse(value)).toEqual({...value, provider: 'chatgpt'})
  expect(poffoVoiceSchema.safeParse({...value, provider: 'unknown'}).success).toBe(false)
})
it('should persist ChatGPT settings independently while keeping the local voice and model', () => {
  const value = {...DEFAULT_POFFO_VOICE, model: 'full', provider: 'chatgpt', voice: 'Hana'}
  expect(poffoVoiceSchema.parse(value)).toEqual(value)
})

it('should migrate the previously saved Haetsal provider to the current ChatGPT setting', () => {
  const value = {
    ...DEFAULT_POFFO_VOICE,
    enabled: true,
    model: 'full',
    provider: 'haetsal',
    voice: 'Hana',
  }
  expect(poffoVoiceSchema.parse(value)).toEqual({...value, provider: 'chatgpt'})
})

it('should default legacy settings to automatic GPU and preserve an explicit CPU selection', () => {
  const {gpu: _, ...legacy} = DEFAULT_POFFO_VOICE
  expect(poffoVoiceSchema.parse(legacy).gpu).toBe(true)
  expect(poffoVoiceSchema.parse({...legacy, gpu: false}).gpu).toBe(false)
})
