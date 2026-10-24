import {getLocale} from '@paraglide/runtime'
import {Show} from 'solid-js'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  PServicePolicyDocument,
  type ServicePolicyContentsItem,
} from '../p-service-policy-document/PServicePolicyDocument'
import {ControllerAndDataSections} from '../privacy-policy/ControllerAndDataSections'
import {LocalAndRetentionSections} from '../privacy-policy/LocalAndRetentionSections'
import {RightsAndProtectionSections} from '../privacy-policy/RightsAndProtectionSections'
import {SharingAndProcessingSections} from '../privacy-policy/SharingAndProcessingSections'
import {EnglishPrivacyPolicyContent} from './EnglishPrivacyPolicyContent'
import {CONTENT_LINK_CLASSES, type PPrivacyPolicyProps} from '../privacy-policy/shared'
export type {PPrivacyPolicyProps, PrivacyPolicyPlatform} from '../privacy-policy/shared'

const CONTENT_ITEMS = [
  {id: 'controller', label: '1. 개인정보처리자'},
  {id: 'data', label: '2. 처리 항목과 목적'},
  {id: 'local-data', label: '3. 기기 내 정보'},
  {id: 'retention', label: '4. 보유기간'},
  {id: 'sharing', label: '5. 제3자 제공'},
  {id: 'processors', label: '6. 처리위탁'},
  {id: 'overseas', label: '7. 국외 이전'},
  {id: 'rights', label: '8. 이용자의 권리'},
  {id: 'deletion', label: '9. 파기'},
  {id: 'automatic', label: '10. 자동 수집과 보안'},
  {id: 'children', label: '11. 아동의 개인정보'},
  {id: 'contact', label: '12. 문의와 변경'},
] as const satisfies ReadonlyArray<ServicePolicyContentsItem>

const renderKoreanPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <PServicePolicyDocument
    backHref={props.backHref}
    backLabel={props.backLabel}
    contents={CONTENT_ITEMS}
    contentsLabel="개인정보처리방침 목차"
    contentsTitle="Contents"
    currentPolicy="privacy"
    description={
      <>
        개인사업자 {SERVICE_OPERATOR.businessName}은 Pomofi 이용자의 개인정보를 필요한 범위에서만
        처리하고 안전하게 보호합니다.
      </>
    }
    eyebrow={
      <>
        <Show fallback="Web privacy policy" when={props.platform === 'apps-in-toss'}>
          Apps in Toss privacy policy
        </Show>
      </>
    }
    footer={
      <>
        <span>
          개인정보 문의:{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
        </span>
        <span>© Pomofi</span>
      </>
    }
    metadata={
      <>
        <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 9월 13일 · 문서 버전 1.2</p>
        <p class="mb-0 mt-3 text-xs text-#a99cab">
          개정 내용: Google Calendar 데이터의 처리 목적, 보관·삭제 방법과 제한적 사용 요건 명시
          (이전 버전 1.1: 2026년 8월 22일)
        </p>
      </>
    }
    notice={{
      description: (
        <>
          대화문, 기기에서 생성한 음성과 집중 설정은 현재 서버에 업로드되지 않습니다. 계정 운영에
          필요한 식별정보와 세션 정보를 서버에서 처리하며, Google Calendar를 연결하면 계정
          연결정보와 요청한 기간의 일정도 캘린더 기능 제공을 위해 서버에서 처리합니다.
        </>
      ),
      title: '핵심 안내',
    }}
    platform={props.platform ?? 'web'}
    title="Pomofi 개인정보처리방침"
  >
    <ControllerAndDataSections platform={props.platform} />
    <LocalAndRetentionSections />
    <SharingAndProcessingSections />
    <RightsAndProtectionSections />
  </PServicePolicyDocument>
)

export const PPrivacyPolicy = (props: PPrivacyPolicyProps) => (
  <Show fallback={renderKoreanPrivacyPolicy(props)} when={getLocale() === 'en'}>
    <EnglishPrivacyPolicyContent {...props} />
  </Show>
)
