import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import {createEmptyAlbumTranslations} from 'src/features/admin-music'
import {AlbumTranslationFields} from '../AlbumTranslationFields'

const gpuDescriptor = Object.getOwnPropertyDescriptor(navigator, 'gpu')

const translations = {
  en: {description: 'English description', title: 'Night'},
  ja: {description: '日本語の説明', title: '夜'},
  'zh-Hans': {description: '中文说明', title: '夜晚'},
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  if (gpuDescriptor === undefined) {
    Reflect.deleteProperty(navigator, 'gpu')
  } else {
    Object.defineProperty(navigator, 'gpu', gpuDescriptor)
  }
})

it('should unlock after Worker construction fails and translate on retry in the same form', async () => {
  Object.defineProperty(navigator, 'gpu', {configurable: true, value: {}})
  const terminate = vi.fn()
  const postMessage = vi.fn()
  class TranslationWorker extends EventTarget {
    terminate = terminate
    postMessage(request: unknown) {
      postMessage(request)
      this.dispatchEvent(new MessageEvent('message', {data: {translations, type: 'complete'}}))
    }
  }
  const createWorker = vi
    .fn()
    .mockImplementationOnce(function createWorker() {
      throw new DOMException('Worker blocked', 'SecurityError')
    })
    .mockImplementation(function createWorker() {
      return new TranslationWorker()
    })
  vi.stubGlobal('Worker', createWorker)
  const values = {...createEmptyAlbumTranslations(), ko: {description: '한국어 설명', title: '밤'}}
  const [current, setCurrent] = createSignal(values)
  render(() =>
    createComponent(AlbumTranslationFields, {
      onValuesChange: setCurrent,
      get values() {
        return current()
      },
    }),
  )

  await page.getByText('다국어 제목·설명', {exact: false}).click()
  const button = page.getByRole('button', {name: '한국어에서 자동 번역'})
  await button.click()
  expect(screen.getByText('번역을 시작하지 못했습니다. 다시 시도해 주세요.')).toBeVisible()
  await expect.element(button).toBeEnabled()
  expect(current()).toEqual(values)
  await button.click()
  await expect
    .element(page.getByText('번역 초안을 채웠습니다. 고유명사와 표현을 확인해 주세요.'))
    .toBeVisible()
  expect(current()).toEqual({...values, ...translations})
  expect(createWorker).toHaveBeenCalledTimes(2)
  expect(postMessage).toHaveBeenCalledExactlyOnceWith({...values.ko, type: 'translate'})
  cleanup()
  expect(terminate).toHaveBeenCalledOnce()
})
