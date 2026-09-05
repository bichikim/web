import * as m from '@paraglide/message'

import {cx} from 'class-variance-authority'

import {SERVICE_OPERATOR} from 'src/features/service-operator'

import {AccountAndAiSections} from './service-terms/AccountAndAiSections'
import {CoreTermsSections} from './service-terms/CoreTermsSections'
import {OperationTermsSections} from './service-terms/OperationTermsSections'
import {PlatformTermsSection} from './service-terms/PlatformTermsSection'
import {CONTENT_LINK_CLASSES, type PServiceTermsProps} from './service-terms/shared'
import {PServicePolicyLinks} from './PServicePolicyLinks'
import {TermsIntro} from './service-terms/TermsIntro'
import {TermsNavigation} from './service-terms/TermsNavigation'
export type {PServiceTermsProps, ServiceTermsPlatform} from './service-terms/shared'

const MAIN_CLASSES = cx(
  'relative min-h-dvh overflow-x-hidden bg-#17131f px-5 py-10 text-#f8edf1',
  'xs:px-8 xs:py-16',
)
const BACKGROUND_CLASSES = cx(
  'pointer-events-none absolute inset-0',
  'bg-[radial-gradient(circle_at_50%_0%,#594560_0%,#2a2135_34%,#17131f_72%)]',
)
const ARTICLE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)
const BACK_LINK_CLASSES =
  'w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white focus-visible:text-white'
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

export const PServiceTerms = (props: PServiceTermsProps) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />
    <div class="relative mx-auto grid w-full max-w-6xl gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <a class={BACK_LINK_CLASSES} href={props.backHref ?? '/'}>
          <span aria-hidden="true">←</span> {props.backLabel ?? m.app_return()}
        </a>
        <PServicePolicyLinks
          currentPolicy="terms"
          platform={props.platform ?? 'web'}
          tone="overlay"
        />
      </div>
      <TermsIntro platform={props.platform} />
      <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
        <h2 class="m-0 text-base font-750 text-#ffd4de">중요한 이용 조건</h2>
        <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">
          타인의 권리를 침해하거나 AI 생성 사실을 숨기는 용도로 음성 기능을 사용할 수 없습니다. 유료
          서비스의 해지와 환불 조건은 구매 전에 반드시 확인해 주세요.
        </p>
      </aside>
      <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <TermsNavigation />
        <article class={ARTICLE_CLASSES}>
          <div class="grid gap-8">
            <CoreTermsSections />
            <PlatformTermsSection platform={props.platform} />
            <AccountAndAiSections platform={props.platform} />
            <OperationTermsSections platform={props.platform} />
          </div>
        </article>
      </div>
      <footer class={FOOTER_CLASSES}>
        <span>
          약관 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </footer>
    </div>
  </main>
)
