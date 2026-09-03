import {PButton} from '../PButton'
import {PServicePolicyLinks} from '../PServicePolicyLinks'
import * as m from '@paraglide/message'
import smilingFaceSource from '../assets/pomodoro-status-icons/break.webp'
import {CLASSES} from './shared'

interface PEntryProps {
  readonly isExiting: boolean
  readonly onEnter: () => void
  readonly onExitComplete: () => void
}

export const PEntry = (props: PEntryProps) => (
  <section
    aria-label={m.scene_start_label()}
    class={CLASSES.entry}
    data-exiting={props.isExiting ? '' : undefined}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) {
        props.onExitComplete()
      }
    }}
  >
    <div class={CLASSES.entryContent}>
      <div class="grid gap-3">
        <PButton
          class={CLASSES.entryAction}
          disabled={props.isExiting}
          leadingImage={smilingFaceSource}
          leadingImageClass={CLASSES.entryLeadingImage}
          onPress={() => props.onEnter()}
          tone="primary"
          trailingIcon="i-tabler-arrow-right"
        >
          {m.scene_start_action()}
        </PButton>
        <PServicePolicyLinks tone="overlay" />
      </div>
    </div>
  </section>
)
