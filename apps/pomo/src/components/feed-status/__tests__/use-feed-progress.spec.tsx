/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import type {PFeedState} from 'src/features/focus-room-feed'
import {
  createFeeds,
  createModelDownload,
  RECOVERY_JOB,
} from 'src/components/__tests__/feed-status/fixtures'
import {useFeedProgress} from '../use-feed-progress'

const originalGetLocale = getLocale

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalGetLocale)
  vi.restoreAllMocks()
})

it('should localize initial and chunk messages through the same English mount', () => {
  overwriteGetLocale(() => 'en')
  const [state, setState] = createSignal<PFeedState>({
    message: '새 피드 음성을 만들고 있어요.',
    progress: null,
    status: 'generating',
  })
  const feeds = createFeeds([], false, [], {state})
  const {result} = renderHook(() => useFeedProgress(() => feeds, createModelDownload()))

  expect(result.generation()?.message).toBe('Generating audio for 새 피드.')
  expect(result.progress()?.message).toBe('Generating audio for 새 피드.')

  setState({message: '새 피드 · 1/2 구간 생성 중', progress: 50, status: 'generating'})
  expect(result.generation()?.message).toBe('Generating audio for 새 피드 · 1/2 segments.')
  expect(result.progress()?.message).toBe('Generating audio for 새 피드 · 1/2 segments.')

  setState({message: '생성 완료', status: 'idle'})
  expect(result.generation()).toBeNull()
  expect(result.progress()).toBeNull()
})

it('should preserve initial and chunk messages for the Korean locale', () => {
  overwriteGetLocale(() => 'ko')
  const [state, setState] = createSignal<PFeedState>({
    message: '새 피드 음성을 만들고 있어요.',
    progress: null,
    status: 'generating',
  })
  const feeds = createFeeds([], false, [], {state})
  const {result} = renderHook(() => useFeedProgress(() => feeds, createModelDownload()))

  expect(result.progress()?.message).toBe('새 피드 음성을 만들고 있어요.')

  setState({message: '새 피드 · 1/2 구간 생성 중', progress: 50, status: 'generating'})
  expect(result.progress()?.message).toBe('새 피드 · 1/2 구간 생성 중')
})

it('should preserve preparation text while localizing only generation messages', () => {
  overwriteGetLocale(() => 'en')
  const feeds = createFeeds([], false, [], {
    state: () => ({message: '음성 모델을 준비하고 있어요.', progress: null, status: 'preparing'}),
  })
  const {result} = renderHook(() => useFeedProgress(() => feeds, createModelDownload()))

  expect(result.progress()?.message).toBe('음성 모델을 준비하고 있어요.')
})

it('should keep the existing localized voice download message', () => {
  overwriteGetLocale(() => 'en')
  const download = {
    ...createModelDownload(),
    state: () => ({
      label: 'Supertonic Full voice',
      percentage: 42,
      status: 'loading' as const,
      target: {kind: 'voice' as const, modelId: 'full' as const},
    }),
  }
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const {result} = renderHook(() => useFeedProgress(() => feeds, download))

  expect(result.progress()?.message).toBe('Downloading the Supertonic Full voice model · 42%')
})

it('should show a localized error after a same-mount stop request fails', async () => {
  overwriteGetLocale(() => 'en')
  const completion = Promise.withResolvers<void>()
  const cancelProcessing = vi.fn(() => completion.promise)
  const feeds = createFeeds([], false, [], {
    cancelProcessing,
    state: () => ({message: '새 피드 음성을 만들고 있어요.', progress: null, status: 'generating'}),
  })
  const {result} = renderHook(() => useFeedProgress(() => feeds, createModelDownload()))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const stopping = result.handleStop()
  expect(result.stopping()).toBe(true)
  expect(cancelProcessing).toHaveBeenCalledOnce()

  completion.reject(new Error('cancel failed'))
  await stopping

  expect(result.stopping()).toBe(false)
  expect(result.error()).toBe(m.feed_stop_failed())
})
