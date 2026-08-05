/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createPlayer} from '../create-player'
import {createShakaPlayer} from '../player/shaka'
import type {PlayerLoadApi} from '../player/types'

vi.mock('../player/shaka', () => ({createShakaPlayer: vi.fn()}))

const createVideoElement = () => {
  const element = document.createElement('video')

  vi.spyOn(element, 'pause').mockImplementation(() => undefined)
  vi.spyOn(element, 'play').mockResolvedValue(undefined)

  return element
}

const createPlayerApi = (): PlayerLoadApi => ({
  destroy: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(undefined),
})

describe('createPlayer', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should destroy the owned player when the element changes and the owner disposes', async () => {
    const firstPlayer = createPlayerApi()
    const secondPlayer = createPlayerApi()

    vi.mocked(createShakaPlayer).mockReturnValueOnce(firstPlayer).mockReturnValueOnce(secondPlayer)

    const firstElement = createVideoElement()
    const secondElement = createVideoElement()
    let dispose: () => void = () => undefined
    let setElement: (element: HTMLVideoElement | null) => HTMLVideoElement | null = () => null

    createRoot((rootDispose) => {
      dispose = rootDispose
      const [element, updateElement] = createSignal<HTMLVideoElement | null>(firstElement)

      setElement = updateElement
      createPlayer(element)
    })

    setElement(secondElement)
    await Promise.resolve()

    expect(firstPlayer.destroy).toHaveBeenCalledOnce()
    expect(secondPlayer.destroy).not.toHaveBeenCalled()

    dispose()
    await Promise.resolve()

    expect(secondPlayer.destroy).toHaveBeenCalledOnce()
  })

  it('should apply object and updater setter forms to the video element', () => {
    const element = createVideoElement()

    vi.mocked(createShakaPlayer).mockReturnValue(createPlayerApi())

    createRoot((dispose) => {
      const [, setState] = createPlayer(() => element)

      setState({currentTime: 12, muted: true, paused: true, volume: 0.4})

      expect(element.currentTime).toBe(12)
      expect(element.muted).toBe(true)
      expect(element.volume).toBe(0.4)
      expect(element.pause).toHaveBeenCalledOnce()

      setState((previousState) => ({...previousState, paused: false, volume: 0.8}))

      expect(element.volume).toBe(0.8)
      expect(element.play).toHaveBeenCalledOnce()
      dispose()
    })
  })

  it('should destroy a player at most once', async () => {
    const player = createPlayerApi()

    vi.mocked(createShakaPlayer).mockReturnValue(player)

    let dispose: () => void = () => undefined
    let destroy: () => Promise<void> | void = () => undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      const [, , api] = createPlayer(() => createVideoElement())

      destroy = api.destroy
    })

    await destroy()
    dispose()
    await Promise.resolve()

    expect(player.destroy).toHaveBeenCalledOnce()
  })
})
