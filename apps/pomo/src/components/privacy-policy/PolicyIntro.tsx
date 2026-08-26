import {Show} from 'solid-js'
import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {PPrivacyPolicyProps} from './shared'

export const PolicyIntro = (props: PPrivacyPolicyProps) => (
  <header>
    <p class="m-0 text-xs font-750 tracking-[0.24em] text-#f2a7b8 uppercase">
      <Show fallback="Web privacy policy" when={props.platform === 'apps-in-toss'}>
        Apps in Toss privacy policy
      </Show>
    </p>
    <h1 class="mb-0 mt-4 max-w-3xl text-3xl font-800 tracking--0.04em xs:text-5xl xs:leading-tight">
      Pomofi 개인정보처리방침
    </h1>
    <p class="mb-0 mt-5 max-w-3xl text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8">
      개인사업자 {SERVICE_OPERATOR.businessName}은 Pomofi 이용자의 개인정보를 필요한 범위에서만
      처리하고 안전하게 보호합니다.
    </p>
    <p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.1</p>
  </header>
)
