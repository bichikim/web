import {type JSX} from 'solid-js'
import {PButton} from '../PButton'
import {PServicePolicyLinks} from '../PServicePolicyLinks'
import * as m from '@paraglide/message'
import smilingFaceSource from '../assets/pomodoro-status-icons/break.webp'
import {CLASSES} from './shared'

const ENTRY_STYLE: JSX.CSSProperties = {
  background: [
    'radial-gradient(ellipse 125% 105% at 0% 108%, ',
    'rgb(7 5 4 / 94%) 0%, rgb(7 5 4 / 82%) 28%, ',
    'rgb(7 5 4 / 58%) 54%, rgb(7 5 4 / 30%) 74%, transparent 92%)',
  ].join(''),
}

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
    style={ENTRY_STYLE}
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
