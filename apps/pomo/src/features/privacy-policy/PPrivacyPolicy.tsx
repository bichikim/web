import {cx} from 'class-variance-authority'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {PServicePolicyLinks} from 'src/features/service-terms'
import {ControllerAndDataSections} from './ControllerAndDataSections'
import {LocalAndRetentionSections} from './LocalAndRetentionSections'
import {PolicyIntro} from './PolicyIntro'
import {PolicyNavigation} from './PolicyNavigation'
import {RightsAndProtectionSections} from './RightsAndProtectionSections'
import {SharingAndProcessingSections} from './SharingAndProcessingSections'
import {CONTENT_LINK_CLASSES, type PPrivacyPolicyProps} from './shared'
export type {PPrivacyPolicyProps, PrivacyPolicyPlatform} from './shared'

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
  'shadow-[0_28px_100px_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)
const BACK_LINK_CLASSES =
  'w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white focus-visible:text-white'
const FOOTER_CLASSES = cx(
  'grid gap-2 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

export const PPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <main class={MAIN_CLASSES}>
    <div class={BACKGROUND_CLASSES} />
    <div class="relative mx-auto grid w-full max-w-6xl gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <a class={BACK_LINK_CLASSES} href={props.backHref ?? '/'}>
          ← {props.backLabel ?? 'Pomofi로 돌아가기'}
        </a>
        <PServicePolicyLinks
          currentPolicy="privacy"
          platform={props.platform ?? 'web'}
          tone="overlay"
        />
      </div>
      <PolicyIntro platform={props.platform} />
      <aside class="rounded-5 border border-#f2a7b8/20 bg-#f2a7b8/7 p-5" role="note">
        <h2 class="m-0 text-base font-750 text-#ffd4de">핵심 안내</h2>
        <p class="mb-0 mt-2 text-sm leading-7 text-#d8cbd9">
          대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지 않습니다. 계정 운영에
          필요한 식별정보와 세션 정보만 서버에서 처리합니다.
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
