import * as m from '@paraglide/message'

import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {PServicePolicyLinks} from 'src/components/PServicePolicyLinks'
import {PolicyArticle} from '../components/refund-policy/PolicyArticle'
import {PolicyIntro} from '../components/refund-policy/PolicyIntro'
import {PolicyNavigation} from '../components/refund-policy/PolicyNavigation'
import {CONTENT_LINK_CLASSES} from '../components/refund-policy/shared'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const FOOTER_CLASSES = cx(
  'grid gap-3 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

export default function RefundPolicyPage() {
  return (
    <main class={MAIN_CLASSES}>
      <div class={BACKGROUND_CLASSES} />

      <div class="relative mx-auto grid w-full max-w-6xl gap-8">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
            <span aria-hidden="true">←</span> {m.app_return()}
          </A>
          <PServicePolicyLinks currentPolicy="refund" platform="apps-in-toss" tone="overlay" />
        </div>

        <PolicyIntro />
        <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
          <PolicyNavigation />
          <PolicyArticle />
        </div>

        <footer class={FOOTER_CLASSES}>
          <div>
            <p class="m-0 font-700 text-#a99cab">환불 접수 및 문의</p>
            <p class="mb-0 mt-1">
              <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
                {SERVICE_OPERATOR.supportEmail}
              </a>
            </p>
          </div>
          <span>© Pomofi</span>
        </footer>
      </div>
    </main>
  )
}
