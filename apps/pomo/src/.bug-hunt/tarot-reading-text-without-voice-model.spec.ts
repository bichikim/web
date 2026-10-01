/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import type {ModelDownloadResult} from '../features/model-download'
import {useTarotReading} from '../features/tarot/use-tarot-reading'

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  startTextModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  startVoiceModel: vi.fn<() => Promise<ModelDownloadResult>>(),
  supportsWebGpu: vi.fn<() => boolean>(),
  textDownloaded: vi.fn<() => Promise<boolean>>(),
  voiceDownloaded: vi.fn<() => Promise<boolean>>(),
}))

vi.mock('../features/text-generation', () => ({
  getTextModel: () => ({downloadSize: '100MB'}),
  isTextModelDownloaded: mocks.textDownloaded,
  supportsWebGpu: mocks.supportsWebGpu,
}))

vi.mock('../features/supertonic/download', () => ({
  isSupertonicModelDownloaded: mocks.voiceDownloaded,
}))

vi.mock('../features/supertonic/model', () => ({
  getSupertonicModel: () => ({size: 200_000_000}),
}))

vi.mock('../features/model-storage/size', () => ({
  formatModelDownloadSize: () => '200MB',
}))

vi.mock('../features/model-download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/model-download')>()
  return {
    ...actual,
    useModelDownload: () => ({
      downloads: () => [],
      startTextModel: mocks.startTextModel,
      startVoiceModel: mocks.startVoiceModel,
    }),
  }
})

vi.mock('../features/tarot/client', () => ({
  createTarotClient: () => ({
    dispose: vi.fn(),
    generate: mocks.generate,
  }),
}))

afterEach(() => {
  vi.clearAllMocks()
})

it('should start Gemma interpretation without blocking on the voice model download', async () => {
  mocks.supportsWebGpu.mockReturnValue(true)
  mocks.textDownloaded.mockResolvedValue(true)
  mocks.voiceDownloaded.mockResolvedValue(false)

  const [locale] = createSignal<'ko' | 'en'>('ko')
  const {cleanup, result: reading} = renderHook(() => useTarotReading({locale}))

  reading.setQuestion('오늘 운세')
  reading.draw()

  await Promise.resolve()
  await Promise.resolve()

  expect(reading.status()).toBe('generating')
  expect(mocks.generate).toHaveBeenCalledOnce()
  expect(mocks.startVoiceModel).not.toHaveBeenCalled()
  cleanup()
})
