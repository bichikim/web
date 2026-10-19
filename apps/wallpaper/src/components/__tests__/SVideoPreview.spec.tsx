/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SVideoPreview} from '../SVideoPreview'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const renderVideo = (autoplay = false) => {
  render(() => (
    <figure aria-label="Video preview">
      <SVideoPreview src="blob:video" label="Video" autoplay={autoplay} />
    </figure>
  ))
  return screen.getByRole('figure', {name: 'Video preview'}).querySelector('video')!
}

it('should seek a paused thumbnail into the video after metadata loads to request a decoded frame', () => {
  const video = renderVideo()
  Object.defineProperty(video, 'duration', {value: 5})
  fireEvent.loadedMetadata(video)
  expect(video.currentTime).toBeGreaterThan(0)
  expect(video.currentTime).toBeLessThan(video.duration)
  expect(video.autoplay).toBe(false)
  expect(video.paused).toBe(true)
  expect(screen.queryByRole('button')).toBeNull()
})

it('should seek inside a very short video without passing its end', () => {
  const video = renderVideo()
  Object.defineProperty(video, 'duration', {value: 0.04})
  fireEvent.loadedMetadata(video)
  expect(video.currentTime).toBeGreaterThan(0)
  expect(video.currentTime).toBeLessThan(video.duration)
})

it.each([0, NaN, Infinity])(
  'should not seek when duration %s has no finite frame range',
  (duration) => {
    const video = renderVideo()
    Object.defineProperty(video, 'duration', {value: duration})
    fireEvent.loadedMetadata(video)
    expect(video.currentTime).toBe(0)
  },
)

it('should expose custom pause and resume controls synchronized with playback events', async () => {
  const video = renderVideo(true)
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => fireEvent.pause(video))
  const play = vi.spyOn(video, 'play').mockImplementation(async () => {
    fireEvent.playing(video)
  })
  Object.defineProperty(video, 'paused', {configurable: true, value: false})
  fireEvent.playing(video)
  fireEvent.click(screen.getByRole('button', {name: '미리보기 일시정지'}))
  expect(pause).toHaveBeenCalledOnce()
  Object.defineProperty(video, 'paused', {value: true})
  fireEvent.click(screen.getByRole('button', {name: '미리보기 재생'}))
  expect(play).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', {name: '미리보기 일시정지'})).toBeVisible()
  expect(video.autoplay).toBe(true)
  expect(video.loop).toBe(true)
  expect(video.muted).toBe(true)
  await Promise.resolve()
})

it('should leave playback available for retry when the browser rejects play', async () => {
  const video = renderVideo(true)
  const play = vi
    .spyOn(video, 'play')
    .mockRejectedValue(new DOMException('Blocked', 'NotAllowedError'))
  fireEvent.click(screen.getByRole('button', {name: '미리보기 재생'}))
  await Promise.resolve()
  expect(screen.getByRole('button', {name: '미리보기 재생'})).toBeEnabled()
  fireEvent.click(screen.getByRole('button', {name: '미리보기 재생'}))
  expect(play).toHaveBeenCalledTimes(2)
  await Promise.resolve()
})
