import {afterEach, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('should expose only production models outside development', async () => {
  vi.stubEnv('DEV', false)
  const {getTextModel, TEXT_MODEL_IDS, TEXT_MODELS} = await import('../model')

  expect(TEXT_MODEL_IDS).toEqual(['gemma-4-e2b', 'gemma-4-e2b-mobile'])
  expect(TEXT_MODELS.map((model) => model.id)).toEqual(TEXT_MODEL_IDS)
  expect(getTextModel('gemma-4-e2b-mobile')).toMatchObject({id: 'gemma-4-e2b-mobile'})
})
