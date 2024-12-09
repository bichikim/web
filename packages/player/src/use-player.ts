import {useEvent} from '@winter-love/solid-use'
import {Accessor, createEffect, createSignal, Setter} from 'solid-js'
import {
  LoadOptions,
  PlayerApi,
  PlayerAPiOptions,
  PlayerLoadApi,
  PlayerState,
  PlayerStateMutable,
} from 'src/player/types'
import {createShakaPlayer} from './player/shaka'

export const createPlayer = (
  videoElement: Accessor<HTMLVideoElement | null>,
  options: PlayerAPiOptions = {},
): [Accessor<PlayerState>, Setter<PlayerStateMutable>, PlayerApi] => {
  let player: PlayerLoadApi | undefined
  const getState = (videoElement?: HTMLVideoElement | null): PlayerState => {
    if (!videoElement) {
      return {
        currentTime: 0,
        duration: 0,
        muted: false,
        paused: true,
        seeking: false,
        volume: 1,
      }
    }
    return {
      currentTime: videoElement.currentTime,
      duration: videoElement.duration,
      muted: videoElement.muted,
      paused: videoElement.paused,
      seeking: videoElement.seeking,
      volume: videoElement.volume,
    }
  }

  const [state, _setState] = createSignal<PlayerState>(getState(videoElement()))

  createEffect(() => {
    const element = videoElement()
    if (!element) {
      return
    }
    const {api = 'shaka'} = options
    setState(getState(element))
    switch (api) {
      case 'shaka': {
        player = createShakaPlayer(element, options)
        break
      }
      // Add more player options here
      default: {
        player = createShakaPlayer(element, options)
      }
    }
  })

  const update = (event: Event) => {
    const {target} = event
    if (target instanceof HTMLVideoElement) {
      setState(getState(target))
    }
  }

  useEvent(videoElement, 'loadedmetadata', update)
  useEvent(videoElement, 'volumechange', update)
  useEvent(videoElement, 'seeking', update)
  useEvent(videoElement, 'seeked', update)
  useEvent(videoElement, 'timeupdate', update)
  useEvent(videoElement, 'play', update)
  useEvent(videoElement, 'pause', update)

  const pause = () => {
    videoElement()?.pause()
  }

  const play = () => {
    return videoElement()?.play() ?? Promise.reject(new Error('You should init player'))
  }

  const load = (url: string, options: LoadOptions = {}): Promise<any> => {
    return (
      player?.load(url, options) ??
      Promise.reject(new Error('You should init a video element'))
    )
  }

  const destroy = (): Promise<any> => {
    return (
      player?.destroy() ?? Promise.reject(new Error('You should init a video element'))
    )
  }

  const setState = (
    state: ((state: PlayerStateMutable) => PlayerStateMutable) | PlayerStateMutable,
  ) => {
    if (typeof state === 'function') {
      _setState((prev) => {
        return {
          ...prev,
          ...state(prev),
        }
      })
    }
  }

  return [
    state,
    setState,
    {
      destroy,
      load,
      pause,
      play,
    },
  ]
}
