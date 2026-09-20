/** @vitest-environment node */
/**
 * Bug hunt: useAlbumTranslation applies stale worker completes after a newer translate starts.
 * Worker root cause: album-translation/worker.ts lacks in-flight request serialization.
 */
import {createRoot} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {CreateAlbumTranslationClientOptions} from '../features/album-translation/client'
import {useAlbumTranslation} from '../features/album-translation/use-album-translation'

const FIRST = {
  en: {description: 'First', title: 'First'},
  ja: {description: '一', title: '一'},
  'zh-Hans': {description: '一', title: '一'},
} as const

const SECOND = {
  en: {description: 'Second', title: 'Second'},
  ja: {description: '二', title: '二'},
  'zh-Hans': {description: '二', title: '二'},
} as const

it('should not apply a stale complete after a newer translate has already finished', () => {
  let options: CreateAlbumTranslationClientOptions | undefined
  const onComplete = vi.fn(() => true)
  const controller = createRoot(() =>
    useAlbumTranslation({
      onComplete,
      runtime: {
        createClient: (nextOptions) => {
          options = nextOptions
          return {dispose: vi.fn(), translate: vi.fn()}
        },
        supportsWebGpu: () => true,
      },
    }),
  )

  controller.translate({description: '첫', title: '첫'})
  options?.onResponse({type: 'started'})
  options?.onResponse({translations: SECOND, type: 'complete'})
  expect(onComplete).toHaveBeenLastCalledWith(SECOND)

  controller.translate({description: '둘', title: '둘'})
  options?.onResponse({type: 'started'})
  options?.onResponse({translations: FIRST, type: 'complete'})

  expect(onComplete).toHaveBeenLastCalledWith(SECOND)
  expect(controller.state()).toEqual({status: 'complete'})
})
