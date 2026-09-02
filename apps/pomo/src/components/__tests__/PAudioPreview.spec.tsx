/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PAudioPreview} from '../PAudioPreview'

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

it('should request a source through the shared loading interface', () => {
  const onRequest = vi.fn()
  const result = render(() => <PAudioPreview onRequest={onRequest} title="첫 곡" />)

  fireEvent.click(screen.getByRole('button', {name: '첫 곡 미리 듣기'}))
  expect(onRequest).toHaveBeenCalledOnce()
  expect(result.container.querySelector('audio')).toBeNull()

  result.unmount()
  render(() => <PAudioPreview loading onRequest={onRequest} title="첫 곡" />)
  expect(screen.getByRole('button', {name: '첫 곡 미리 듣기'})).toBeDisabled()
  expect(screen.getByText('음원 불러오는 중…')).toBeDefined()
})

it('should render consistent playback controls for an available source', () => {
  const result = render(() => <PAudioPreview src="blob:audio" title="전체 미리 듣기" />)
  const audio = result.container.querySelector('audio')
  const progress = screen.getByRole('slider', {name: '전체 미리 듣기 재생 위치'})

  expect(audio?.getAttribute('src')).toBe('blob:audio')
  expect(screen.getByRole('button', {name: '전체 미리 듣기 재생'})).toBeDefined()
  expect(progress).toHaveClass('w-full')
  expect(progress).toHaveAttribute('aria-valuetext', '0.0초 / 0.0초')
  expect(screen.getByRole('button', {name: '전체 미리 듣기 음소거'})).toBeDefined()

  if (audio === null) {
    throw new TypeError('Expected the preview audio element to render.')
  }

  fireEvent.play(audio)
  expect(screen.getByRole('button', {name: '전체 미리 듣기 일시정지'})).toBeDefined()
})
