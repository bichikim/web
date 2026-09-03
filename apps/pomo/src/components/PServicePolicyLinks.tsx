import {cva, type VariantProps} from 'class-variance-authority'
import {Show} from 'solid-js'

import {SERVICE_POLICY_PATHS} from '../features/service-terms'
import * as m from '@paraglide/message'
import {PolicyLink} from './service-terms/PolicyLink'

const policyLinksClasses = cva('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5', {
  defaultVariants: {
    tone: 'surface',
  },
  variants: {
    tone: {
      overlay: 'text-[#fff9f1]/80 [text-shadow:0_0.0625rem_0.1875rem_rgb(0_0_0_/_55%)]',
      surface: 'text-muted-foreground',
    },
  },
})

export interface PServicePolicyLinksProps extends VariantProps<typeof policyLinksClasses> {
  currentPolicy?: 'privacy' | 'refund' | 'terms'
  platform?: 'apps-in-toss' | 'web'
}

const serviceTermsPath = (platform: 'apps-in-toss' | 'web') =>
  platform === 'apps-in-toss'
    ? SERVICE_POLICY_PATHS.appsInToss.terms
    : SERVICE_POLICY_PATHS.web.terms
const privacyPolicyPath = (platform: 'apps-in-toss' | 'web') =>
  platform === 'apps-in-toss'
    ? SERVICE_POLICY_PATHS.appsInToss.privacy
    : SERVICE_POLICY_PATHS.web.privacy

export const PServicePolicyLinks = (props: PServicePolicyLinksProps) => {
  const platform = () =>
    props.platform ??
    (import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true' ? 'apps-in-toss' : 'web')

  return (
    <nav aria-label={m.policy_navigation()} class={policyLinksClasses({tone: props.tone})}>
      <PolicyLink
        current={props.currentPolicy === 'terms'}
        href={serviceTermsPath(platform())}
        label={m.policy_terms()}
        tone={props.tone}
      />
      <span aria-hidden="true">·</span>
      <PolicyLink
        current={props.currentPolicy === 'privacy'}
        href={privacyPolicyPath(platform())}
        label={m.policy_privacy()}
        tone={props.tone}
      />
      <Show when={platform() === 'apps-in-toss'}>
        <span aria-hidden="true">·</span>
        <PolicyLink
          current={props.currentPolicy === 'refund'}
          href={SERVICE_POLICY_PATHS.refund}
          label={m.policy_refund()}
          tone={props.tone}
        />
      </Show>
    </nav>
  )
}
