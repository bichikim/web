import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {createLoopPlayer, type LoopPlayback} from '../loop-player'
import {readWebStorageJson, writeWebStorageJson} from 'src/utils/runtime-storage'
import type {SoundEffect} from './types'

export const DEFAULT_SOUND_EFFECT_VOLUME = 0.4
export const SOUND_EFFECT_VOLUME_STEP = 0.05
const PERCENT_SCALE = 100
const SOUND_EFFECT_VOLUME_STORAGE_PREFIX = 'pomo:sound-effect-volume:v1:'

export interface SoundEffectPlayback {
  readonly activate: () => void
  readonly error: Accessor<Error | null>
  readonly playing: Accessor<boolean>
  readonly ready: Accessor<boolean>
  readonly setVolume: (volume: number) => void
  readonly stop: () => void
  readonly volume: Accessor<number>
}

const toError = (cause: unknown): Error =>
  cause instanceof Error ? cause : new Error('효과음을 재생하지 못했어요.', {cause})

const normalizeVolume = (volume: number): number =>
  Math.min(1, Math.max(0, Math.round(volume * PERCENT_SCALE) / PERCENT_SCALE))

const parseStoredVolume = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    return null
  }
  return normalizeVolume(value)
}

const readStoredVolume = (effectId: string): number | null =>
  readWebStorageJson(`${SOUND_EFFECT_VOLUME_STORAGE_PREFIX}${effectId}`, parseStoredVolume)

const writeStoredVolume = (effectId: string, volume: number): void => {
  const error = writeWebStorageJson(`${SOUND_EFFECT_VOLUME_STORAGE_PREFIX}${effectId}`, volume)
  if (error !== null) {
    console.warn('Sound-effect volume could not be persisted', error)
  }
}

/** Creates a client-only repeating playback controller for one catalog effect. */
export const useSoundEffectPlayback = (getEffect: Accessor<SoundEffect>): SoundEffectPlayback => {
  const [error, setError] = createSignal<Error | null>(null)
  const [playing, setPlaying] = createSignal(false)
  const [ready, setReady] = createSignal(false)
  const [volume, setVolumeState] = createSignal(DEFAULT_SOUND_EFFECT_VOLUME)
  let player: LoopPlayback | undefined
  let pendingPlay = false
  let starting = false
  let startingRevision: number | undefined
  let effectId: string | undefined
  let manuallyStopped = false
  let playbackRevision = 0

  const start = async () => {
    const current = player
    const currentRevision = playbackRevision
    if (current === undefined || !ready() || volume() <= 0 || starting) {
      return
    }

    starting = true
    startingRevision = currentRevision
    pendingPlay = false
    try {
      await current.play()
      if (current === player && currentRevision === playbackRevision && volume() > 0) {
        setPlaying(true)
      }
    } catch (cause: unknown) {
      if (current === player && currentRevision === playbackRevision && volume() > 0) {
        setPlaying(false)
        setError(toError(cause))
      }
    } finally {
      starting = false
      startingRevision = undefined
      if (current === player && pendingPlay && volume() > 0) {
        start().catch(() => undefined)
      }
    }
  }

  const requestPlay = () => {
    if (playing() || volume() <= 0) {
      return
    }
    setError(null)
    if (starting) {
      if (startingRevision !== playbackRevision) {
        pendingPlay = true
      }
      return
    }
    pendingPlay = true
    if (ready()) {
      start().catch(() => undefined)
    }
  }

  const activate = () => {
    manuallyStopped = false
    requestPlay()
  }

  const stopPlayback = () => {
    playbackRevision += 1
    pendingPlay = false
    player?.stop()
    setPlaying(false)
  }

  const stop = () => {
    manuallyStopped = true
    stopPlayback()
  }

  const setVolume = (nextVolume: number) => {
    const next = normalizeVolume(nextVolume)
    setVolumeState(next)
    if (effectId !== undefined) {
      writeStoredVolume(effectId, next)
    }
    try {
      player?.setVolume(next)
    } catch (cause: unknown) {
      setError(toError(cause))
    }

    if (next === 0) {
      stopPlayback()
      return
    }

    if (!manuallyStopped) {
      requestPlay()
    }
  }

  onMount(() => {
    try {
      const effect = getEffect()
      effectId = effect.id
      const storedVolume = readStoredVolume(effect.id)
      const initialVolume = storedVolume ?? DEFAULT_SOUND_EFFECT_VOLUME
      setVolumeState(initialVolume)
      pendingPlay = initialVolume > 0
      player = createLoopPlayer(
        effect.source,
        (message, active) => {
          setPlaying(active)
          if (!active) {
            setError(new Error(message))
          }
        },
        () => {
          setReady(true)
          if (pendingPlay) {
            start().catch(() => undefined)
          }
        },
      )
      player.setVolume(initialVolume)
    } catch (cause: unknown) {
      setError(toError(cause))
    }
  })

  onCleanup(() => {
    pendingPlay = false
    const current = player
    player = undefined
    if (current !== undefined) {
      current.close().catch((cause: unknown) => {
        console.warn('Sound-effect cleanup failed', cause)
      })
    }
  })

  return {activate, error, playing, ready, setVolume, stop, volume}
}
