import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'
import type {CreateAlbumTranslationClientOptions} from '../client'
import {useAlbumTranslation} from '../use-album-translation'

vi.mock('../../text-generation/environment', () => ({supportsWebGpu: () => false}))

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
  const translations = {
    en: {description: 'en', title: 'en'},
    ja: {description: 'ja', title: 'ja'},
    'zh-Hans': {description: 'zh', title: 'zh'},
  }
  options?.onResponse({translations, type: 'complete'})
  expect(complete).toHaveBeenCalledWith(translations)
  expect(controller.state()).toEqual({status: 'complete'})
  cleanup()
  expect(dispose).toHaveBeenCalledOnce()
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
