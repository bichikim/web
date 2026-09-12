/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {useModelDownload} from 'src/features/model-download'
import {createFeeds, createModelDownload} from '../../__tests__/feed-status/fixtures'
import {PFeedProgress} from '../Progress'
vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
beforeEach(() => {
  localStorage.setItem('pomo:feed-reading-status-visible:v1', 'false')
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
})
afterEach(() => {
  cleanup()
  localStorage.clear()
})
it('should show progress and stop controls even when the studio progress card is hidden', async () => {
  const feeds = createFeeds([], false, [], {
    state: () => ({message: '음성 생성 중', progress: 40, status: 'generating'}),
  })
  render(() => <PFeedProgress controller={feeds} />)
  expect(screen.getByText(/음성 생성 중/)).toBeInTheDocument()
  expect(screen.getByText(/40%/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  await vi.waitFor(() => expect(feeds.cancelProcessing).toHaveBeenCalledOnce())
})
it('should remove progress when the work completes', () => {
  const [busy, setBusy] = createSignal(true)
  const feeds = createFeeds([], false, [], {
    state: () =>
      busy()
        ? {message: '준비 중', progress: null, status: 'preparing'}
        : {message: '완료', status: 'idle'},
  })
  render(() => <PFeedProgress controller={feeds} />)
  expect(screen.getByRole('button', {name: '중지'})).toBeInTheDocument()
  setBusy(false)
  expect(screen.queryByRole('button', {name: '중지'})).toBeNull()
})
it('should disable duplicate stop requests and show failures', async () => {
  const pending = Promise.withResolvers<void>()
  const feeds = createFeeds([], false, [], {
    cancelProcessing: vi.fn(() => pending.promise),
    state: () => ({message: '생성 중', progress: null, status: 'generating'}),
  })
  render(() => <PFeedProgress controller={feeds} />)
  const button = screen.getByRole('button', {name: '중지'})
  fireEvent.click(button)
  expect(button).toBeDisabled()
  pending.reject(new Error('failed'))
  await vi.waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('중지하지 못했어요'))
  expect(button).not.toBeDisabled()
})
