/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {useMusicPlayer} from '../use-music-player'

const albums = [
  {
    artist: 'ASH',
    id: 'one',
    title: '오후',
    tracks: [
      {id: 'first', src: '/music/a.mp3', title: '창문'},
      {id: 'second', src: '/music/b.mp3', title: '부츠 끈'},
    ],
  },
  {
    artist: 'ASH',
    id: 'two',
    title: '저녁',
    tracks: [{id: 'first', src: '/music/c.mp3', title: '가로등'}],
  },
]

const Player = () => {
  const [element, setElement] = createSignal<HTMLAudioElement | null>(null)
  const player = useMusicPlayer({element})
  return (
    <>
      <audio ref={setElement} src={player.track()?.src} onEnded={player.ended} aria-label="음원" />
      <p role="status">{player.track()?.title ?? '불러오는 중'}</p>
      <button type="button" onClick={player.next}>
        다음
      </button>
    </>
  )
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
  vi.spyOn(Math, 'random').mockReturnValue(0)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(JSON.stringify({albums, version: 1}))),
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('should shuffle tracks across every album and repeat without immediate duplicates', async () => {
  render(() => <Player />)
  await screen.findByText('부츠 끈')
  const visited = [screen.getByRole('status').textContent]
  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  visited.push(screen.getByRole('status').textContent)
  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  visited.push(screen.getByRole('status').textContent)
  expect([...visited].sort()).toEqual(['가로등', '부츠 끈', '창문'])
  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  expect(screen.getByRole('status').textContent).not.toBe(visited.at(-1))
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
})

test('should continue playback automatically after a track ends', async () => {
  render(() => <Player />)
  await screen.findByText('부츠 끈')
  fireEvent.ended(screen.getByLabelText('음원'))
  expect(screen.getByRole('status').textContent).toBe('가로등')
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
})
