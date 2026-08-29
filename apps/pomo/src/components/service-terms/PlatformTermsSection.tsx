import {Show} from 'solid-js'
import {HEADING_CLASSES, PARAGRAPH_CLASSES, PServiceTermsProps, SECTION_CLASSES} from './shared'

export const PlatformTermsSection = (props: PServiceTermsProps) => (
  <section class={SECTION_CLASSES} id="platform">
    <h2 class={HEADING_CLASSES}>제5조 플랫폼별 이용 환경</h2>
    <Show
      fallback={
        <>
          <p class={PARAGRAPH_CLASSES}>
            웹 서비스는 Pomofi가 안내하는 웹 주소와 지원 브라우저에서 제공됩니다. 브라우저 사업자,
            운영체제 사업자 또는 로그인 제공자의 서비스에는 각 사업자의 약관과 정책이 별도로
            적용됩니다.
          </p>
          <p class={PARAGRAPH_CLASSES}>
            브라우저 저장 공간, 쿠키 또는 네트워크를 차단하면 일부 기능이나 설정 저장이 정상적으로
            동작하지 않을 수 있습니다.
          </p>
        </>
      }
      when={props.platform === 'apps-in-toss'}
    >
      <p class={PARAGRAPH_CLASSES}>
        앱인토스용 서비스는 토스 앱 안의 미니앱 환경에서 제공됩니다. 토스 계정, 토스 앱 및 앱인토스
        플랫폼 자체의 이용에는 토스 또는 플랫폼 운영자가 정한 약관과 정책이 별도로 적용됩니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi가 직접 제공하는 기능과 콘텐츠에는 본 약관이 적용됩니다. 토스 앱 또는 앱인토스
        플랫폼의 점검, 정책 변경이나 장애로 서비스 이용이 제한될 수 있습니다.
      </p>
    </Show>
  </section>
)
