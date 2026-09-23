import {getLocale} from '@paraglide/runtime'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {PServicePolicyLinks} from '../p-service-policy-links/PServicePolicyLinks'
import {ControllerAndDataSections} from '../privacy-policy/ControllerAndDataSections'
import {LocalAndRetentionSections} from '../privacy-policy/LocalAndRetentionSections'
import {PolicyIntro} from '../privacy-policy/PolicyIntro'
import {PolicyNavigation} from '../privacy-policy/PolicyNavigation'
import {RightsAndProtectionSections} from '../privacy-policy/RightsAndProtectionSections'
import {SharingAndProcessingSections} from '../privacy-policy/SharingAndProcessingSections'
import {PAppReturnLink} from '../p-app-return-link/PAppReturnLink'
import {EnglishPrivacyPolicyContent} from './EnglishPrivacyPolicyContent'
import {CONTENT_LINK_CLASSES, type PPrivacyPolicyProps} from '../privacy-policy/shared'
export type {PPrivacyPolicyProps, PrivacyPolicyPlatform} from '../privacy-policy/shared'

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
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

const renderKoreanPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />
    <div class="relative mx-auto grid w-full max-w-6xl gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <PServicePolicyLinks
          currentPolicy="privacy"
          platform={props.platform ?? 'web'}
          tone="overlay"
        />
        <PAppReturnLink href={props.backHref} label={props.backLabel} />
      </div>
      <PolicyIntro platform={props.platform} />
      <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
        <h2 class="m-0 text-base font-750 text-#ffd4de">핵심 안내</h2>
        <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">
          대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지 않습니다. 계정 운영에
          필요한 식별정보와 세션 정보를 서버에서 처리하며, Google Calendar를 연결하면 계정
          연결정보와 요청한 기간의 일정도 캘린더 기능 제공을 위해 서버에서 처리합니다.
        </p>
      </aside>
      <div class="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:items-start">
        <PolicyNavigation />
        <article class={ARTICLE_CLASSES}>
          <div class="grid gap-8">
            <ControllerAndDataSections platform={props.platform} />
            <LocalAndRetentionSections />
            <SharingAndProcessingSections />
            <RightsAndProtectionSections />
          </div>
        </article>
      </div>
      <footer class={FOOTER_CLASSES}>
        <span>
          개인정보 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </footer>
    </div>
  </main>
)

export const PPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <Show fallback={renderKoreanPrivacyPolicy(props)} when={getLocale() === 'en'}>
    <EnglishPrivacyPolicyContent {...props} />
  </Show>
)
