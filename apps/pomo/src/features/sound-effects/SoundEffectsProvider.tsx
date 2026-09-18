import {createSignal, For, type JSX, onCleanup, onMount} from 'solid-js'

import {SoundEffectsContext, type SoundEffectsController} from './context'
import {loadSoundEffects} from './load-sound-effects'
import type {SoundEffect} from './types'
import {type SoundEffectPlayback, useSoundEffectPlayback} from './use-sound-effect'

export interface SoundEffectsProviderProps {
  readonly children: JSX.Element
}

interface SoundEffectRuntimeProps {
  readonly effect: SoundEffect
  readonly onRegister: (effectId: string, playback: SoundEffectPlayback) => void
  readonly onUnregister: (effectId: string, playback: SoundEffectPlayback) => void
}

const SoundEffectRuntime = (props: SoundEffectRuntimeProps) => {
  const playback = useSoundEffectPlayback(() => props.effect)

  onMount(() => props.onRegister(props.effect.id, playback))
  onCleanup(() => props.onUnregister(props.effect.id, playback))

  return null
}

export const SoundEffectsProvider = (props: SoundEffectsProviderProps) => {
  const [effects, setEffects] = createSignal<readonly SoundEffect[]>([])
  const [playbacks, setPlaybacks] = createSignal<ReadonlyMap<string, SoundEffectPlayback>>(
    new Map(),
  )
  const [status, setStatus] = createSignal<'loading' | 'ready' | 'failed'>('loading')
  const [isStopped, setIsStopped] = createSignal(false)
  const controller = new AbortController()

  const registerPlayback = (effectId: string, playback: SoundEffectPlayback) => {
    if (isStopped()) {
      playback.stop()
    }
    setPlaybacks((current) => {
      const next = new Map(current)
      next.set(effectId, playback)
      return next
    })
  }

  const unregisterPlayback = (effectId: string, playback: SoundEffectPlayback) => {
    setPlaybacks((current) => {
      if (current.get(effectId) !== playback) {
        return current
      }

      const next = new Map(current)
      next.delete(effectId)
      return next
    })
  }

  const activate = () => {
    setIsStopped(false)
    const currentPlaybacks = playbacks()
    for (const playback of currentPlaybacks.values()) {
      playback.activate()
    }
  }

  const stop = () => {
    setIsStopped(true)
    const currentPlaybacks = playbacks()
    for (const playback of currentPlaybacks.values()) {
      playback.stop()
    }
  }

  const handleUserActivation = () => {
    if (isStopped() || playbacks().size === 0) {
      return
    }

    activate()
    globalThis.document.removeEventListener('keydown', handleUserActivation)
    globalThis.document.removeEventListener('pointerdown', handleUserActivation)
  }

  onMount(() => {
    loadSoundEffects({signal: controller.signal})
      .then((loadedEffects) => {
        setEffects(loadedEffects)
        setStatus('ready')
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          console.warn('Sound-effect catalog failed to load', cause)
          setStatus('failed')
        }
      })
  })

  onMount(() => {
    globalThis.document.addEventListener('keydown', handleUserActivation)
    globalThis.document.addEventListener('pointerdown', handleUserActivation)
    onCleanup(() => {
      globalThis.document.removeEventListener('keydown', handleUserActivation)
      globalThis.document.removeEventListener('pointerdown', handleUserActivation)
    })
  })

  onCleanup(() => controller.abort())

  const value: SoundEffectsController = {
    activate,
    effects,
    getPlayback: (effectId) => playbacks().get(effectId),
    isStopped,
    status,
    stop,
  }

  return (
    <SoundEffectsContext.Provider value={value}>
      <For each={effects()}>
        {(effect) => (
          <SoundEffectRuntime
            effect={effect}
            onRegister={registerPlayback}
            onUnregister={unregisterPlayback}
          />
        )}
      </For>
      {props.children}
    </SoundEffectsContext.Provider>
  )
}
