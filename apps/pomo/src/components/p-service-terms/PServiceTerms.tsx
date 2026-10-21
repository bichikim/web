import {getLocale} from '@paraglide/runtime'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  PServicePolicyDocument,
  type ServicePolicyContentsItem,
} from '../p-service-policy-document/PServicePolicyDocument'
import {AccountAndAiSections} from '../service-terms/AccountAndAiSections'
import {CoreTermsSections} from '../service-terms/CoreTermsSections'
import {OperationTermsSections} from '../service-terms/OperationTermsSections'
import {PlatformTermsSection} from '../service-terms/PlatformTermsSection'
import {CONTENT_LINK_CLASSES, type PServiceTermsProps} from '../service-terms/shared'
import {EnglishServiceTermsContent} from './EnglishServiceTermsContent'
export type {PServiceTermsProps, ServiceTermsPlatform} from '../service-terms/shared'

const BUSINESS_INFORMATION_CLASSES = cx(
  'mb-0 mt-6 grid max-w-3xl gap-x-6 gap-y-2 rounded-4 border border-white/10',
  'bg-white/4 p-4 text-sm leading-6 text-#d8cbd9 sm:grid-cols-[auto_1fr]',
)

const CONTENT_ITEMS = [
  {id: 'purpose', label: '1. 목적과 적용 범위'},
  {id: 'definitions', label: '2. 용어의 정의'},
  {id: 'agreement', label: '3. 약관의 효력과 변경'},
  {id: 'service', label: '4. 서비스의 내용'},
  {id: 'platform', label: '5. 이용 환경'},
  {id: 'account', label: '6. 계정과 이용자의 의무'},
  {id: 'ai-voice', label: '7. AI 음성 기능'},
  {id: 'restricted-uses', label: '8. 금지 행위'},
  {id: 'rights', label: '9. 콘텐츠와 권리'},
  {id: 'payment', label: '10. 결제와 환불'},
  {id: 'availability', label: '11. 변경과 중단'},
  {id: 'termination', label: '12. 이용 종료'},
  {id: 'responsibility', label: '13. 책임 범위'},
  {id: 'disputes', label: '14. 문의와 분쟁 해결'},
] as const satisfies ReadonlyArray<ServicePolicyContentsItem>

const renderKoreanServiceTerms = (props: PServiceTermsProps) => (
  <PServicePolicyDocument
    backHref={props.backHref}
    backLabel={props.backLabel}
    businessInformation={
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
    }
    contents={CONTENT_ITEMS}
    contentsLabel="서비스 이용약관 목차"
    contentsTitle="Contents"
    currentPolicy="terms"
    description={
      <>Pomofi의 집중 도구, 콘텐츠 및 AI 음성 기능을 이용할 때 적용되는 권리와 의무를 안내합니다.</>
    }
    eyebrow={
      <>
        <Show fallback="Web terms of service" when={props.platform === 'apps-in-toss'}>
          Apps in Toss terms of service
        </Show>
      </>
    }
    footer={
      <>
        <span>
          약관 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </>
    }
    metadata={
      <>
        <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.0</p>
      </>
    }
    notice={{
      description: (
        <>
          타인의 권리를 침해하거나 AI 생성 사실을 숨기는 용도로 음성 기능을 사용할 수 없습니다. 유료
          서비스의 해지와 환불 조건은 구매 전에 반드시 확인해 주세요.
        </>
      ),
      title: '중요한 이용 조건',
    }}
    platform={props.platform ?? 'web'}
    title="Pomofi 서비스 이용약관"
  >
    <CoreTermsSections />
    <PlatformTermsSection platform={props.platform} />
    <AccountAndAiSections platform={props.platform} />
    <OperationTermsSections platform={props.platform} />
  </PServicePolicyDocument>
)

export const PServiceTerms = (props: PServiceTermsProps) => (
  <Show fallback={renderKoreanServiceTerms(props)} when={getLocale() === 'en'}>
    <EnglishServiceTermsContent {...props} />
  </Show>
)
