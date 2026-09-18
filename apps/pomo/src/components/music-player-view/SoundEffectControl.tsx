import {getLocale} from '@paraglide/runtime'
import {cx} from 'class-variance-authority'
import {onMount, Show} from 'solid-js'
import * as m from '@paraglide/message'

import {
  SOUND_EFFECT_VOLUME_STEP,
  type SoundEffect,
  type SoundEffectPlayback,
  useSoundEffects,
} from '../../features/sound-effects'

const VOLUME_DRAG_DISTANCE = 120
const PERCENT_SCALE = 100

interface SoundEffectControlProps {
  readonly effect: SoundEffect
}

interface SoundEffectControlViewProps extends SoundEffectControlProps {
  readonly playback: SoundEffectPlayback
}

const getTitle = (effect: SoundEffect): string =>
  getLocale() === 'ko' ? effect.title.ko : effect.title.en

const getVolumePercentage = (volume: number): number => Math.round(volume * PERCENT_SCALE)

const SoundEffectControlView = (props: SoundEffectControlViewProps) => {
  const title = () => getTitle(props.effect)
  let dragStart: {readonly clientY: number; readonly volume: number} | undefined

  onMount(() => props.playback.activate())

  const updateVolume = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    const start = dragStart
    if (start === undefined) {
      return
    }

    const delta = start.clientY - event.clientY
    props.playback.setVolume(start.volume + delta / VOLUME_DRAG_DISTANCE)
  }

  const releasePointer = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragStart = undefined
  }

  const handlePointerDown = (event: PointerEvent & {currentTarget: HTMLButtonElement}) => {
    if (event.button !== 0) {
      return
    }
    dragStart = {clientY: event.clientY, volume: props.playback.volume()}
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        props.playback.setVolume(props.playback.volume() - SOUND_EFFECT_VOLUME_STEP)
        break
      case 'ArrowUp':
        event.preventDefault()
        props.playback.setVolume(props.playback.volume() + SOUND_EFFECT_VOLUME_STEP)
        break
      case 'End':
        event.preventDefault()
        props.playback.setVolume(0)
        break
      case 'Home':
        event.preventDefault()
        props.playback.setVolume(1)
        break
    }
  }

  return (
    <article class="flex flex-col items-center gap-3 py-3">
      <button
        aria-busy={!props.playback.ready() && props.playback.error() === null}
        aria-label={`${title()} ${m.sound_effects_volume()}`}
        aria-valuemax={PERCENT_SCALE}
        aria-valuemin="0"
        aria-valuenow={getVolumePercentage(props.playback.volume())}
        aria-valuetext={`${getVolumePercentage(props.playback.volume())}%`}
        class={cx(
          'relative grid size-28 max-md:size-14 touch-none select-none place-items-center overflow-hidden',
          'cursor-grab rounded-full border-2 border-solid border-border bg-surface-overlay',
          'shadow-panel outline-none transition-[transform,box-shadow,opacity] active:cursor-grabbing',
          'hover:scale-[1.02] focus-visible:shadow-focus motion-reduce:transition-none',
          'data-[playing=true]:border-primary data-[playing=true]:shadow-[0_0_0_0.25rem_rgb(216_104_69_/_22%)]',
          !props.playback.ready() && 'opacity-65',
        )}
        data-playing={props.playback.playing()}
        data-ready={props.playback.ready()}
        disabled={props.playback.error() !== null}
        onKeyDown={handleKeyDown}
        onPointerCancel={releasePointer}
        onPointerDown={handlePointerDown}
        onPointerMove={updateVolume}
        onPointerUp={releasePointer}
        role="slider"
        type="button"
      >
        <img
          alt=""
          class="pointer-events-none size-full object-cover"
          draggable={false}
          src={props.effect.artworkUrl}
        />
        <span
          aria-hidden="true"
          class={
            'pointer-events-none absolute rounded-full bg-black/50 px-3 py-1 ' +
            'text-xl font-750 text-white shadow-panel max-md:px-1.5 max-md:py-0.5 max-md:text-sm'
          }
        >
          {getVolumePercentage(props.playback.volume())}%
        </span>
      </button>
      <strong class="text-sm font-750 text-foreground">{title()}</strong>
      <Show when={props.playback.error()}>
        {(error) => <p class="m-0 text-xs text-danger">{error().message}</p>}
      </Show>
    </article>
  )
}

export const SoundEffectControl = (props: SoundEffectControlProps) => {
  const soundEffects = useSoundEffects()
  const playback = () => soundEffects.getPlayback(props.effect.id)

  return (
    <Show when={playback()}>
      {(currentPlayback) => (
        <SoundEffectControlView effect={props.effect} playback={currentPlayback()} />
      )}
    </Show>
  )
}
