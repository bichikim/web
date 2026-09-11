import {createSignal, Show} from 'solid-js'
import * as m from '@paraglide/message'
import type {PSceneStyle} from '../../features/focus-room-animation'
import {getPomoIconClass} from '../icon-style'
import {PModal} from '../PModal'
import {PPlayerUtilityButton} from '../PPlayerUtilityButton'

interface SoundEffectsProps {
  readonly sceneStyle?: PSceneStyle
}

export const SoundEffects = (props: SoundEffectsProps) => {
  const [isOpen, setIsOpen] = createSignal(false)
  const [trigger, setTrigger] = createSignal<HTMLButtonElement | null>(null)

  const handlePress = (source: HTMLButtonElement) => {
    setTrigger(source)
    setIsOpen(true)
  }

  return (
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
          title={m.sound_effects_title()}
        >
          <p class="m-0 py-8 text-center text-muted-foreground">{m.sound_effects_empty()}</p>
        </PModal>
      </Show>
    </>
  )
}
