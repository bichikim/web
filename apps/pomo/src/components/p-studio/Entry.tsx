import {PButton} from '../p-button/PButton'
import {PServicePolicyLinks} from '../p-service-policy-links/PServicePolicyLinks'
import * as m from '@paraglide/message'
import {A} from '@solidjs/router'
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
    <h1 class={CLASSES.entryTitle}>Pomofi</h1>
    <div class={CLASSES.entryContent}>
      <p class={CLASSES.entryDescription}>{m.app_home_description()}</p>
      <div class="grid gap-3">
        <PButton
          pill
          raised
          class={CLASSES.entryAction}
          disabled={props.isExiting}
          leadingImage={smilingFaceSource}
          leadingOverflow
          onPress={() => props.onEnter()}
          tone="primary"
          trailingIcon="i-tabler-arrow-right"
        >
          {m.scene_start_action()}
        </PButton>
        <A class={CLASSES.entryWhatsNewLink} href="/whats-new">
          {m.version_notice_title()} <span aria-hidden="true">→</span>
        </A>
        <PServicePolicyLinks tone="overlay" />
      </div>
    </div>
  </section>
)
