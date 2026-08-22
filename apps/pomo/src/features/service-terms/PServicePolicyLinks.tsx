import {cva, type VariantProps} from 'class-variance-authority'
import {Show} from 'solid-js'

const policyLinksClasses = cva('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5', {
  defaultVariants: {
    tone: 'surface',
  },
  variants: {
    tone: {
      overlay: 'text-[#fff9f1]/80 [text-shadow:0_1px_3px_rgb(0_0_0_/_55%)]',
      surface: 'text-muted-foreground',
    },
  },
})

const policyLinkClasses = cva('rounded-sm text-inherit', {
  defaultVariants: {
    current: false,
    tone: 'surface',
  },
  variants: {
    current: {
      false:
        'underline decoration-current/45 underline-offset-3 transition-colors ' +
        'hover:text-foreground focus-visible:text-foreground focus-visible:shadow-focus ' +
        'focus-visible:outline-none motion-reduce:transition-none',
      true: 'font-700 no-underline',
    },
    tone: {
      overlay: 'hover:text-white focus-visible:text-white',
      surface: '',
    },
  },
})

export interface PServicePolicyLinksProps extends VariantProps<typeof policyLinksClasses> {
  currentPolicy?: 'privacy' | 'refund' | 'terms'
  platform?: 'apps-in-toss' | 'web'
}

interface PolicyLinkProps extends VariantProps<typeof policyLinkClasses> {
  href: string
  label: string
}

const serviceTermsPath = (platform: 'apps-in-toss' | 'web') =>
  platform === 'apps-in-toss' ? '/apps-in-toss/terms' : '/web/terms'
const privacyPolicyPath = (platform: 'apps-in-toss' | 'web') =>
  platform === 'apps-in-toss' ? '/apps-in-toss/privacy' : '/web/privacy'

const PolicyLink = (props: PolicyLinkProps) => (
  <Show
    fallback={
      <a class={policyLinkClasses({tone: props.tone})} href={props.href}>
        {props.label}
      </a>
    }
    when={props.current}
  >
    <span aria-current="page" class={policyLinkClasses({current: true, tone: props.tone})}>
      {props.label}
    </span>
  </Show>
)

export const PServicePolicyLinks = (props: PServicePolicyLinksProps) => {
  const platform = () =>
    props.platform ?? (import.meta.env.POMO_IS_APPS_IN_TOSS ? 'apps-in-toss' : 'web')

  return (
    <nav aria-label="서비스 정책" class={policyLinksClasses({tone: props.tone})}>
      <PolicyLink
        current={props.currentPolicy === 'terms'}
        href={serviceTermsPath(platform())}
        label="서비스 이용약관"
        tone={props.tone}
      />
      <span aria-hidden="true">·</span>
      <PolicyLink
        current={props.currentPolicy === 'privacy'}
        href={privacyPolicyPath(platform())}
        label="개인정보처리방침"
        tone={props.tone}
      />
      <Show when={platform() === 'apps-in-toss'}>
        <span aria-hidden="true">·</span>
        <PolicyLink
          current={props.currentPolicy === 'refund'}
          href="/refund-policy"
          label="환불 및 청약철회 정책"
          tone={props.tone}
        />
      </Show>
    </nav>
  )
}
