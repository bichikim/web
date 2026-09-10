/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {LoopPlayerPage} from '../LoopPlayerPage'
import {useLoopPlayer} from 'src/features/loop-player'

const play = vi.fn()
const previewPosition = vi.fn()
const seek = vi.fn()
const select = vi.fn()
const setOverlap = vi.fn()
const stop = vi.fn()
const [playing, setPlaying] = createSignal(false)

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/loop-player', () => ({useLoopPlayer: vi.fn()}))

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(A).mockImplementation((props) => props.children)
  vi.mocked(useLoopPlayer).mockReturnValue({
    duration: () => 12,
    overlap: () => 4,
    play,
    playing,
    position: () => 0,
    previewPosition,
    seek,
    select,
    setOverlap,
    status: () => '재생 준비 완료',
    stop,
  })
  vi.clearAllMocks()
  setPlaying(false)
})
afterEach(cleanup)

it('should delegate file selection, overlap changes, playback, preview, and seeking to the loop player', () => {
  render(() => <LoopPlayerPage />)
  const file = new File(['audio'], 'rain.wav', {type: 'audio/wav'})
  fireEvent.change(screen.getByLabelText('오디오 파일'), {target: {files: [file]}})
  fireEvent.input(screen.getByRole('spinbutton', {name: '겹쳐 재생할 시간 (초)'}), {
    target: {value: '3.5'},
  })
  const position = screen.getByRole('slider', {name: '재생 위치'})
  fireEvent.input(position, {target: {value: '4'}})
  fireEvent.change(position)
  fireEvent.click(screen.getByRole('button', {name: '루프 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '연결 직전부터 듣기'}))

  expect(select).toHaveBeenCalledWith(file)
  expect(setOverlap).toHaveBeenCalledWith(3.5)
  expect(previewPosition).toHaveBeenCalledWith(4)
  expect(seek).toHaveBeenCalledOnce()
  expect(play).toHaveBeenNthCalledWith(1, false)
  expect(play).toHaveBeenNthCalledWith(2, true)
})

it('should stop active loop playback', () => {
  render(() => <LoopPlayerPage />)
  setPlaying(true)

  fireEvent.click(screen.getByRole('button', {name: '정지'}))

  expect(stop).toHaveBeenCalledOnce()
})
