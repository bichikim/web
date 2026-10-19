/** @vitest-environment node */
import {createComputed, createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {SajuReadingInput} from '../calculate-reading'
import {type SajuReadingServices, useSajuReading} from '../use-saju-reading'

const birth = {calendar: 'solar', date: '1995-03-16'} as const
const generationInput: SajuReadingInput = {birth, gender: 'N', question: '제 일은 어떨까요?'}
const flush = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

it.each([
  {input: {...generationInput, question: '올해 운세는?'}, label: 'annual notice'},
  {
    input: {...generationInput, birth: {...birth, date: ''}},
    label: 'calculation error',
  },
])(
  'should notify retry consumers when a same-status $label replaces the failed request',
  async ({input}) => {
    const services: SajuReadingServices = {
      createClient: vi.fn(() => ({dispose: vi.fn(), generate: vi.fn()})),
      defaultModelId: () => 'gemma-4-e2b',
      downloads: {
        cancel: vi.fn(),
        downloads: () => [],
        startTextModel: vi.fn(async () => ({status: 'complete' as const})),
      },
      downloadSize: () => '',
      isDownloaded: vi.fn(async () => {
        throw new Error('모델 저장소 오류')
      }),
      supportsModel: () => true,
    }
    const root = createRoot((dispose) => ({dispose, reading: useSajuReading({services})}))
    try {
      root.reading.submit(generationInput)
      await flush()
      expect(root.reading.status()).toBe('error')
      expect(root.reading.canRetry()).toBe(true)
      const observer = createRoot((dispose) => {
        const values: boolean[] = []
        createComputed(() => values.push(root.reading.canRetry()))
        return {dispose, values}
      })
      try {
        root.reading.submit(input)

        expect(root.reading.status()).toBe('error')
        expect(root.reading.canRetry()).toBe(false)
        expect(observer.values).toEqual([true, false])
        expect(services.isDownloaded).toHaveBeenCalledTimes(1)

        root.reading.submit(generationInput)
        await flush()

        expect(root.reading.status()).toBe('error')
        expect(root.reading.canRetry()).toBe(true)
        expect(observer.values).toEqual([true, false, true])
        expect(services.isDownloaded).toHaveBeenCalledTimes(2)
        expect(services.createClient).not.toHaveBeenCalled()
      } finally {
        observer.dispose()
      }
    } finally {
      root.dispose()
    }
  },
)
