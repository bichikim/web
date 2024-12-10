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
import {updateDrmRequestFilter} from 'src/player/update-drm-filter'
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
      _setState(getState(target))
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
    if (!player) {
      return Promise.reject(new Error('You should init a video element'))
    }

    return player.load(url, options)
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
        const element = videoElement()
        const newState = state(prev)
        if (element) {
          for (const [key, value] of Object.entries(newState)) {
            element[key] = value
          }
        }
        return {
          ...prev,
          ...newState,
        }
      })
    } else {
      _setState((prev) => {
        return {
          ...prev,
          ...state,
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
