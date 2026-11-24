/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {useSpeechStackLayout} from '../use-speech-stack-layout'

afterEach(cleanup)

it('should retain all conversations while limiting stack geometry to three previews', () => {
  const [ids, setIds] = createSignal(Array.from({length: 100}, (_, index) => `chat-${index}`))
  const {result} = renderHook(() =>
    useSpeechStackLayout({
      anchor: () => 'bottom',
      cards: () => new Map(),
      content: () => null,
      element: () => null,
      ids,
      maxHeight: () => 320,
    }),
  )
  expect(result.order()).toHaveLength(100)
  expect(result.offset()).toBe(72)
  expect(result.heightLimit()).toBe(176)
  setIds((value) => [...value, 'another-chat'])
  expect(result.order()).toHaveLength(101)
  expect(result.offset()).toBe(72)
  expect(result.heightLimit()).toBe(176)
})

it('should cap bubble height in tall windows and retain smaller space limits across stack changes', () => {
  const [height, setHeight] = createSignal<number | undefined>(undefined)
  const [ids, setIds] = createSignal<readonly string[]>(['first'])
  const {result} = renderHook(() =>
    useSpeechStackLayout({
      anchor: () => 'bottom',
      cards: () => new Map(),
      content: () => null,
      element: () => null,
      ids,
      maxHeight: height,
    }),
  )
  expect(result.heightLimit()).toBe(250)
  setHeight(1800)
  expect(result.heightLimit()).toBe(250)
  setHeight(320)
  expect(result.heightLimit()).toBe(248)
  setIds(['first', 'second', 'third'])
  expect(result.heightLimit()).toBe(176)
})
