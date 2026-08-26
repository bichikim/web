import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'
import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {CONTENT_LINK_CLASSES, PServiceTermsProps} from './shared'

const BUSINESS_INFORMATION_CLASSES = cx(
  'mb-0 mt-6 grid max-w-3xl gap-x-6 gap-y-2 rounded-4 border border-white/10',
  'bg-white/4 p-4 text-sm leading-6 text-#d8cbd9 sm:grid-cols-[auto_1fr]',
)

export const TermsIntro = (props: PServiceTermsProps) => {
  const isAppsInToss = () => props.platform === 'apps-in-toss'

  return (
    <header>
      <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
        <Show fallback="Web terms of service" when={isAppsInToss()}>
          Apps in Toss terms of service
        </Show>
      </p>
      <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
        Pomofi 서비스 이용약관
      </h1>
      <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
        Pomofi의 집중 도구, 콘텐츠 및 AI 음성 기능을 이용할 때 적용되는 권리와 의무를 안내합니다.
      </p>
      <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.0</p>
      <dl class={BUSINESS_INFORMATION_CLASSES}>
        <dt class="font-750 text-#f8edf1">상호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessName}</dd>
        <dt class="font-750 text-#f8edf1">대표자</dt>
        <dd class="m-0">{SERVICE_OPERATOR.representative}</dd>
        <dt class="font-750 text-#f8edf1">사업자등록번호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessRegistrationNumber}</dd>
        <dt class="font-750 text-#f8edf1">통신판매업 신고</dt>
        <dd class="m-0">신고 의무 면제(직전 연도 통신판매 거래 50회 미만)</dd>
        <dt class="font-750 text-#f8edf1">사업장 소재지</dt>
        <dd class="m-0">{SERVICE_OPERATOR.businessAddress}</dd>
        <dt class="font-750 text-#f8edf1">고객지원 전화번호</dt>
        <dd class="m-0">{SERVICE_OPERATOR.supportPhone}</dd>
        <dt class="font-750 text-#f8edf1">고객지원</dt>
        <dd class="m-0">
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </dd>
      </dl>
    </header>
  )
}
