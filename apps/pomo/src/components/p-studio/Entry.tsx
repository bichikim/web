import {PButton} from '../p-button/PButton'
import {PServicePolicyLinks} from '../p-service-policy-links/PServicePolicyLinks'
import {POLICY_LINK_CLASSES} from '../service-terms/PolicyLink'
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
        <div class={CLASSES.entryFooterLinks}>
          <A class={POLICY_LINK_CLASSES({tone: 'overlay'})} href="/whats-new">
            {m.version_notice_title()}
          </A>
          <span aria-hidden="true">·</span>
          <PServicePolicyLinks tone="overlay" />
        </div>
      </div>
    </div>
  </section>
)
