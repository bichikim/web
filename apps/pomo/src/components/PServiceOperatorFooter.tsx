import {cva} from 'class-variance-authority'
import {Show} from 'solid-js'

import {SERVICE_OPERATOR} from 'src/features/service-operator'

const operatorFooterClasses = cva(
  [
    'pointer-events-auto absolute right-[calc(1rem+var(--pomo-safe-area-inset-right))]',
    'left-[calc(1rem+var(--pomo-safe-area-inset-left))] max-w-md justify-self-end text-right',
    'rounded-3 border border-white/12 bg-black/70 px-3 py-2 backdrop-blur-sm',
    'text-[0.6875rem] leading-5 text-[#fff9f1]/90',
    '[text-shadow:0_1px_3px_rgb(0_0_0_/_70%)] 2xl:left-auto',
  ].join(' '),
  {
    defaultVariants: {
      placement: 'entry',
    },
    variants: {
      placement: {
        entry: 'bottom-[calc(0.75rem+var(--pomo-safe-area-inset-bottom))]',
        studio: [
          'bottom-[calc(7rem+var(--pomo-safe-area-inset-bottom))]',
          '2xl:bottom-[calc(0.75rem+var(--pomo-safe-area-inset-bottom))]',
        ].join(' '),
      },
    },
  },
)

interface PServiceOperatorFooterProps {
  readonly placement: 'entry' | 'studio'
}

export const PServiceOperatorFooter = (props: PServiceOperatorFooterProps) => (
  <footer class={operatorFooterClasses({placement: props.placement})}>
    <address class="not-italic">
      <span>
        {SERVICE_OPERATOR.businessName} · 대표 {SERVICE_OPERATOR.representative} · 사업자등록번호{' '}
        {SERVICE_OPERATOR.businessRegistrationNumber}
      </span>
      <br />
      <span>
        {SERVICE_OPERATOR.businessAddress} · {SERVICE_OPERATOR.supportPhone} ·{' '}
        <a
          class="underline decoration-current/45 underline-offset-3"
          href={`mailto:${SERVICE_OPERATOR.supportEmail}`}
        >
          {SERVICE_OPERATOR.supportEmail}
        </a>
      </span>
    </address>
    <Show when={!import.meta.env.POMO_IS_APPS_IN_TOSS}>
      <div>호스팅 서비스 제공자: {SERVICE_OPERATOR.webHostingProvider}</div>
    </Show>
  </footer>
)
