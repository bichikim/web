/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import type {PFeedState} from 'src/features/focus-room-feed'
import {createFeeds, createModelDownload} from 'src/components/__tests__/feed-status/fixtures'
import {useFeedProgress} from 'src/components/feed-status/use-feed-progress'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should clear a stop failure alert when feed processing is no longer active', async () => {
  const completion = Promise.withResolvers<void>()
  const cancelProcessing = vi.fn(() => completion.promise)
  const [state, setState] = createSignal<PFeedState>({
    message: '새 피드 음성을 만들고 있어요.',
    progress: null,
    status: 'generating',
  })
  const feeds = createFeeds([], false, [], {cancelProcessing, state})
  const {result} = renderHook(() => useFeedProgress(() => feeds, createModelDownload()))
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  const stopping = result.handleStop()
  completion.reject(new Error('cancel failed'))
  await stopping
  expect(result.error()).toBe(m.feed_stop_failed())

  setState({message: '', progress: null, status: 'idle'})
  expect(result.progress()).toBeNull()
  expect(result.error()).toBeNull()
})
