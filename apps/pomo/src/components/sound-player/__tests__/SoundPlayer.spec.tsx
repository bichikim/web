/** @vitest-environment jsdom */
import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type SoundLayer, type SoundPlayerStatus, useSoundPlayer} from 'src/features/sound-player'
import {SoundPlayer} from '../SoundPlayer'

vi.mock('src/features/sound-player/use-sound-player', () => ({useSoundPlayer: vi.fn()}))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const LAYER: SoundLayer = {id: 'rain', source: '/rain.wav', title: '비', volume: 0.5}

it('should dispatch playback commands and reflect every playback state', () => {
  const [status, setStatus] = createSignal<SoundPlayerStatus>('idle')
  const [error, setError] = createSignal<string | null>(null)
  const play = vi.fn(async () => {})
  const pause = vi.fn()
  const stop = vi.fn()
  vi.mocked(useSoundPlayer).mockReturnValue({error, pause, play, status, stop})
  const result = render(() => <SoundPlayer layers={[LAYER]} />)
  const playButton = result.getByRole('button', {name: '전체 재생'})
  const pauseButton = result.getByRole('button', {name: '일시정지'})
  const stopButton = result.getByRole('button', {name: '정지'})

  expect(result.getByRole('status')).toHaveTextContent('정지')
  expect(playButton).toBeEnabled()
  expect(pauseButton).toBeDisabled()
  expect(stopButton).toBeDisabled()
  expect(result.queryByRole('alert')).toBeNull()
  fireEvent.click(playButton)
  expect(play).toHaveBeenCalledOnce()

  setStatus('loading')
  expect(result.getByRole('status')).toHaveTextContent('불러오는 중')
  expect(playButton).toBeDisabled()
  expect(pauseButton).toBeDisabled()
  expect(stopButton).toBeEnabled()
  fireEvent.click(stopButton)
  expect(stop).toHaveBeenCalledOnce()

  setStatus('playing')
  expect(result.getByRole('status')).toHaveTextContent('재생 중')
  expect(playButton).toBeDisabled()
  expect(pauseButton).toBeEnabled()
  fireEvent.click(pauseButton)
  expect(pause).toHaveBeenCalledOnce()

  setStatus('paused')
  expect(result.getByRole('status')).toHaveTextContent('일시정지')
  expect(pauseButton).toBeDisabled()
  fireEvent.click(result.getByRole('button', {name: '이어서 재생'}))
  expect(play).toHaveBeenCalledTimes(2)

  setStatus('error')
  setError('음원을 불러오지 못했습니다.')
  expect(result.getByRole('status')).toHaveTextContent('재생 실패')
  expect(result.getByRole('alert')).toHaveTextContent('음원을 불러오지 못했습니다.')
  expect(playButton).toBeEnabled()
  setError(null)
  expect(result.queryByRole('alert')).toBeNull()
})

it('should pass current layers to playback and disable play for an empty list', () => {
  const [layers, setLayers] = createSignal<readonly SoundLayer[]>([])
  vi.mocked(useSoundPlayer).mockReturnValue({
    error: () => null,
    pause: vi.fn(),
    play: vi.fn(),
    status: () => 'idle',
    stop: vi.fn(),
  })
  const result = render(() => <SoundPlayer layers={layers()} />)
  const options = vi.mocked(useSoundPlayer).mock.calls[0]?.[0]
  const playButton = result.getByRole('button', {name: '전체 재생'})
  expect(playButton).toBeDisabled()
  expect(options?.layers()).toEqual([])
  expect(result.queryByRole('slider')).toBeNull()

  setLayers([LAYER])
  expect(options?.layers()).toEqual([LAYER])
  expect(playButton).toBeEnabled()
  expect(result.getByRole('slider')).toBeDisabled()
  setLayers([])
  expect(playButton).toBeDisabled()
  expect(result.queryByRole('slider')).toBeNull()
})

it('should forward layer edits to the consumer without changing its supplied layer', () => {
  const onLayerChange = vi.fn()
  vi.mocked(useSoundPlayer).mockReturnValue({
    error: () => null,
    pause: vi.fn(),
    play: vi.fn(),
    status: () => 'idle',
    stop: vi.fn(),
  })
  const result = render(() => <SoundPlayer layers={[LAYER]} onLayerChange={onLayerChange} />)
  fireEvent.input(result.getByRole('slider'), {target: {value: '0.25'}})
  expect(onLayerChange).toHaveBeenCalledWith({...LAYER, volume: 0.25})
  expect(onLayerChange.mock.lastCall?.[0]).not.toBe(LAYER)
  expect(LAYER.volume).toBe(0.5)
})
