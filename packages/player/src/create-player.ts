import {useEvent} from '@winter-love/solid-use'
import {Accessor, createEffect, createSignal, onCleanup, Setter} from 'solid-js'
import {
  LoadOptions,
  PlayerApi,
  PlayerAPiOptions,
  PlayerLoadApi,
  PlayerState,
  PlayerStateMutable,
} from 'src/player/types'
import {createShakaPlayer} from './player/shaka'

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

export const createPlayer = (
  videoElement: Accessor<HTMLVideoElement | null>,
  options: PlayerAPiOptions = {},
): [Accessor<PlayerState>, Setter<PlayerStateMutable>, PlayerApi] => {
  let player: PlayerLoadApi | undefined
  const destroyedPlayers = new WeakSet<PlayerLoadApi>()

  const destroyPlayer = async (target: PlayerLoadApi): Promise<void> => {
    if (destroyedPlayers.has(target)) {
      return
    }

    destroyedPlayers.add(target)
    await target.destroy()
  }

  const [state, _setState] = createSignal<PlayerState>(getState(videoElement()))

  createEffect(() => {
    const element = videoElement()

    if (!element) {
      return
    }

    const {api = 'shaka'} = options

    _setState(getState(element))

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

    const currentPlayer = player

    onCleanup(() => {
      if (!currentPlayer) {
        return
      }

      if (player === currentPlayer) {
        player = undefined
      }

      destroyPlayer(currentPlayer).catch(() => undefined)
    })
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

  const destroy = (): Promise<void> => {
    const currentPlayer = player

    if (!currentPlayer) {
      return Promise.reject(new Error('You should init a video element'))
    }

    player = undefined

    return destroyPlayer(currentPlayer)
  }

  const setState: Setter<PlayerStateMutable> = (
    state: ((state: PlayerStateMutable) => PlayerStateMutable) | PlayerStateMutable,
  ) => {
    return _setState((previousState) => {
      const element = videoElement()
      const newState = typeof state === 'function' ? state(previousState) : state

      if (element) {
        element.currentTime = newState.currentTime
        element.muted = newState.muted
        element.volume = newState.volume

        if (newState.paused) {
          element.pause()
        } else {
          element.play().catch(() => undefined)
        }
      }

      return {
        ...previousState,
        ...newState,
      }
    })
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
