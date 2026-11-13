import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {CreateAlbumTranslationClientOptions} from '../client'
import {useAlbumTranslation} from '../use-album-translation'

vi.mock('../../text-generation/environment', () => ({supportsWebGpu: () => false}))

const TRANSLATIONS = {
  en: {description: 'en', title: 'en'},
  ja: {description: 'ja', title: 'ja'},
  'zh-Hans': {description: 'zh', title: 'zh'},
} as const

it('should translate, expose worker progress, complete, and dispose', () => {
  let options: CreateAlbumTranslationClientOptions | undefined
  const dispose = vi.fn()
  const translate = vi.fn()
  const complete = vi.fn()
  let cleanup: () => void = () => undefined
  const controller = createRoot((disposeRoot) => {
    cleanup = disposeRoot
    return useAlbumTranslation({
      onComplete: complete,
      runtime: {
        createClient: (nextOptions) => {
          options = nextOptions
          return {dispose, translate}
        },
        supportsWebGpu: () => true,
      },
    })
  })

  controller.translate({description: '설명', title: '제목'})
  expect(controller.isBusy()).toBe(true)
  expect(translate).toHaveBeenCalledWith({description: '설명', title: '제목'})
  options?.onResponse({
    files: [],
    loadedBytes: 42,
    percentage: 42,
    totalBytes: 100,
    type: 'loading',
  })
  expect(controller.state()).toMatchObject({progress: 42, status: 'loading'})
  options?.onResponse({type: 'started'})
  expect(controller.state()).toMatchObject({status: 'generating'})
  options?.onResponse({
    reason: 'busy',
    request: {description: '중복', title: '중복', type: 'translate'},
    type: 'skipped',
  })
  expect(controller.state()).toMatchObject({status: 'generating'})
  expect(controller.isBusy()).toBe(true)
  expect(complete).not.toHaveBeenCalled()
  expect(dispose).not.toHaveBeenCalled()
  options?.onResponse({translations: TRANSLATIONS, type: 'complete'})
  expect(complete).toHaveBeenCalledWith(TRANSLATIONS)
  expect(controller.state()).toEqual({status: 'complete'})
  cleanup()
  expect(dispose).toHaveBeenCalledOnce()
})

it('should stay idle when the completion consumer discards translations', () => {
  let options: CreateAlbumTranslationClientOptions | undefined
  const controller = createRoot(() =>
    useAlbumTranslation({
      onComplete: () => false,
      runtime: {
        createClient: (nextOptions) => {
          options = nextOptions
          return {dispose: vi.fn(), translate: vi.fn()}
        },
        supportsWebGpu: () => true,
      },
    }),
  )

  controller.translate({description: '설명', title: '제목'})
  options?.onResponse({translations: TRANSLATIONS, type: 'complete'})

  expect(controller.state()).toEqual({status: 'idle'})
})

it('should reject unsupported, blank, and busy translations and recover worker errors', () => {
  const unsupported = createRoot(() =>
    useAlbumTranslation({
      onComplete: vi.fn(),
      runtime: {createClient: vi.fn(), supportsWebGpu: () => false},
    }),
  )
  unsupported.translate({description: '설명', title: '제목'})
  expect(unsupported.state()).toEqual({status: 'unsupported'})

  let options: CreateAlbumTranslationClientOptions | undefined
  const dispose = vi.fn()
  const translate = vi.fn()
  const controller = createRoot(() =>
    useAlbumTranslation({
      onComplete: vi.fn(),
      runtime: {
        createClient: (nextOptions) => {
          options = nextOptions
          return {dispose, translate}
        },
        supportsWebGpu: () => true,
      },
    }),
  )
  controller.translate({description: '', title: '  '})
  expect(translate).not.toHaveBeenCalled()
  controller.translate({description: '', title: '제목'})
  controller.translate({description: '', title: '다른 제목'})
  expect(translate).toHaveBeenCalledOnce()
  options?.onResponse({message: '실패', restartRequired: true, type: 'error'})
  expect(dispose).toHaveBeenCalledOnce()
  expect(controller.state()).toEqual({message: '실패', status: 'error'})
  options?.onResponse({message: '재시도', restartRequired: false, type: 'error'})
  expect(dispose).toHaveBeenCalledOnce()
  ;(options?.onResponse as (response: unknown) => void)({type: 'unexpected'})
})

it('should use the default unsupported runtime when none is provided', () => {
  const controller = createRoot(() => useAlbumTranslation({onComplete: vi.fn()}))

  expect(controller.state()).toEqual({status: 'unsupported'})
})

it.each([
  new Error('Worker denied'),
  new DOMException('Worker denied', 'SecurityError'),
  undefined,
])('should unlock and retry after client creation throws %s', (failure) => {
  const translate = vi.fn()
  const createClient = vi
    .fn()
    .mockImplementationOnce(() => {
      throw failure
    })
    .mockReturnValue({dispose: vi.fn(), translate})
  let cleanup: () => void = () => undefined
  const controller = createRoot((disposeRoot) => {
    cleanup = disposeRoot
    return useAlbumTranslation({
      onComplete: vi.fn(),
      runtime: {createClient, supportsWebGpu: () => true},
    })
  })

  expect(() => controller.translate({description: '설명', title: '제목'})).not.toThrow()
  expect(controller.state()).toEqual({
    message: '번역을 시작하지 못했습니다. 다시 시도해 주세요.',
    status: 'error',
  })
  expect(controller.isBusy()).toBe(false)
  controller.translate({description: '새 설명', title: '새 제목'})
  expect(createClient).toHaveBeenCalledTimes(2)
  expect(translate).toHaveBeenCalledWith({description: '새 설명', title: '새 제목'})
  expect(controller.isBusy()).toBe(true)
  cleanup()
})
