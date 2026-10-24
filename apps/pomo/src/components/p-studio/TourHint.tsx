import * as m from '@paraglide/message'

import {PButton} from '../p-button/PButton'
import {InlineIconText} from '../inline-icon-text/InlineIconText'

export interface PStudioTourHintProps {
  readonly onDismiss?: () => void
}

/** Points first-time users to the focus-room tour after they enter the app. */
export const PStudioTourHint = (props: PStudioTourHintProps) => (
  <aside
    aria-label={m.tour_first_visit_hint_title()}
    aria-live="polite"
    class={
      'pointer-events-auto w-80 max-w-[calc(100vw_-_3.5rem_-_var(--pomo-safe-area-inset-left))] ' +
      'rounded-panel border border-solid border-border ' +
      'bg-surface-strong p-4 text-foreground shadow-panel backdrop-blur-surface'
    }
    role="status"
  >
    <div class="flex items-start gap-3">
      <span
        aria-hidden="true"
        class="i-tabler-arrow-up-right mt-0.5 size-5 flex-none text-highlight"
      />
      <div class="min-w-0 flex-1">
        <p class="m-0 text-sm font-750">{m.tour_first_visit_hint_title()}</p>
        <p class="mb-0 mt-1 text-sm leading-5 text-muted-foreground">
          <InlineIconText
            text={m.tour_first_visit_hint_description()}
            icons={{tour: 'i-tabler-route'}}
          />
        </p>
      </div>
      <PButton
        accessibleLabel={m.common_close()}
        bordered
        icon="i-tabler-x"
        onPress={props.onDismiss}
        size="small"
        tone="secondary"
        transparent
      />
    </div>
  </aside>
)
