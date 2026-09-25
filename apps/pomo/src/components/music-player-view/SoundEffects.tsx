import {createSignal, For, Show} from 'solid-js'
import * as m from '@paraglide/message'
import {useOptionalSoundEffects, useSoundEffects} from '../../features/sound-effects'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {getPomoIconClass} from '../icon-style'
import {PModal} from '../p-modal/PModal'
import {PButton} from '../p-button/PButton'
import {PPlayerUtilityButton} from '../p-player-utility-button/PPlayerUtilityButton'
import {SoundEffectControl} from './SoundEffectControl'

interface SoundEffectsProps {
  readonly sceneStyle?: PSceneStyle
}

const SoundEffectsPlaybackToggle = () => {
  const soundEffects = useSoundEffects()
  const handlePlaybackToggle = () => {
    if (soundEffects.isStopped()) {
      soundEffects.activate()
      return
    }

    soundEffects.stop()
  }

  return (
    <Show when={soundEffects.status() === 'ready' && soundEffects.effects().length > 0}>
      <PButton
        bordered
        icon={soundEffects.isStopped() ? 'i-tabler-volume-2' : 'i-tabler-volume-off'}
        onPress={handlePlaybackToggle}
        size="small"
        tone="secondary"
        transparent
      >
        {soundEffects.isStopped() ? m.sound_effects_start_all() : m.sound_effects_stop_all()}
      </PButton>
    </Show>
  )
}

const SoundEffectsContent = () => {
  const soundEffects = useSoundEffects()

  return (
    <Show
      fallback={
        <Show
          fallback={<p class="m-0 py-8 text-center text-danger">{m.sound_effects_load_error()}</p>}
          when={soundEffects.status() === 'loading'}
        >
          <p class="m-0 py-8 text-center text-muted-foreground">{m.sound_effects_loading()}</p>
        </Show>
      }
      when={soundEffects.status() === 'ready'}
    >
      <Show
        fallback={
          <p class="m-0 py-8 text-center text-muted-foreground">{m.sound_effects_empty()}</p>
        }
        when={soundEffects.effects().length > 0}
      >
        <ul
          class="m-0 flex w-full flex-row flex-wrap items-start justify-start gap-x-4 gap-y-3 p-0"
          aria-label={m.sound_effects_title()}
        >
          <For each={soundEffects.effects()}>
            {(effect) => (
              <li class="shrink-0">
                <SoundEffectControl effect={effect} />
              </li>
            )}
          </For>
        </ul>
      </Show>
    </Show>
  )
}

export const SoundEffects = (props: SoundEffectsProps) => {
  const soundEffects = useOptionalSoundEffects()
  const [isOpen, setIsOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)

  const handlePress = (source: HTMLButtonElement) => {
    setTrigger(source)
    setIsOpen(true)
  }

  return (
    <Show when={soundEffects !== undefined}>
      <>
        <PPlayerUtilityButton
          accessibleLabel={m.sound_effects_title()}
          icon={getPomoIconClass('i-tabler-wave-sine', props.sceneStyle)}
          onPress={handlePress}
          purpose="sound-effects"
        />
        <Show when={isOpen()}>
          <PModal
            isOpen={isOpen()}
            onOpenChange={setIsOpen}
            onCloseAutoFocus={() => trigger()?.focus()}
            description={m.sound_effects_drag_hint()}
            headerActions={<SoundEffectsPlaybackToggle />}
            title={m.sound_effects_title()}
          >
            <SoundEffectsContent />
          </PModal>
        </Show>
      </>
    </Show>
  )
}
