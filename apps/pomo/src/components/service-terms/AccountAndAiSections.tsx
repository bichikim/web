import {Show} from 'solid-js'
import {
  CONTENT_LINK_CLASSES,
  HEADING_CLASSES,
  LIST_CLASSES,
  PARAGRAPH_CLASSES,
  PServiceTermsProps,
  SECTION_CLASSES,
} from './shared'

const EMPHASIS_CLASSES = 'font-750 text-#ffd4de'

export const AccountAndAiSections = (props: PServiceTermsProps) => (
  <>
    <section class={SECTION_CLASSES} id="account">
      <h2 class={HEADING_CLASSES}>제6조 계정과 이용자의 의무</h2>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 본인의 계정과 기기를 안전하게 관리하고, 등록하거나 제공한 정보가 변경되면 최신
        상태로 유지해야 합니다. 계정 또는 인증수단을 제3자에게 양도·대여하거나 부정하게 사용해서는
        안 됩니다.
      </p>
      <Show
        fallback={
          <p class={PARAGRAPH_CLASSES}>
            웹 서비스는 만 14세 이상만 이용할 수 있습니다. 미성년자가 유료 서비스를 구매하는
            경우에는 법정대리인의 동의가 필요할 수 있으며, 동의 없이 체결한 계약은 관계 법령에 따라
            취소될 수 있습니다.
          </p>
        }
        when={props.platform === 'apps-in-toss'}
      >
        <p class={PARAGRAPH_CLASSES}>앱인토스용 서비스는 만 19세 이상만 이용할 수 있습니다.</p>
      </Show>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 관련 법령, 본 약관, 서비스 화면의 안내와 제3자의 권리를 준수해야 하며, 서비스의
        안정적인 운영을 방해해서는 안 됩니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="ai-voice">
      <h2 class={HEADING_CLASSES}>제7조 AI 음성 기능</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi의 음성 합성은 Supertonic 3 모델 등을 이용해 이용자의 기기에서 처리될 수 있습니다.
        실행에 필요한 모델 파일은 외부 저장소에서 내려받을 수 있으며, 기기 환경에 따라 품질과 처리
        시간이 달라질 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        이용자는 생성 음성을 공개·배포하거나 다른 콘텐츠에 사용할 때 사람이 직접 녹음한 음성으로
        오인되지 않도록 <strong class={EMPHASIS_CLASSES}>“AI 생성 음성”</strong> 등 이해하기 쉬운
        방법으로 생성 사실을 표시해야 합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Supertonic 3 모델에는 BigScience OpenRAIL-M License가 적용됩니다. 이용자는 본 약관과{' '}
        <a
          class={CONTENT_LINK_CLASSES}
          href="https://huggingface.co/Supertone/supertonic-3/blob/3cadd1e/LICENSE"
          rel="noreferrer"
          target="_blank"
        >
          모델 원문 라이선스
        </a>
        를 함께 준수해야 합니다.
      </p>
    </section>
    <section class={SECTION_CLASSES} id="restricted-uses">
      <h2 class={HEADING_CLASSES}>제8조 금지 행위</h2>
      <p class={PARAGRAPH_CLASSES}>이용자는 다음 행위를 해서는 안 됩니다.</p>
      <ul class={LIST_CLASSES}>
        <li>법령, 본 약관 또는 제3자의 권리를 위반하는 행위</li>
        <li>타인의 계정이나 정보를 도용하거나 동의 없이 타인을 사칭하는 행위</li>
        <li>AI 생성 사실을 숨기고 생성 음성을 사람이 직접 녹음한 것처럼 공개하는 행위</li>
        <li>타인을 비방·괴롭히거나 허위정보, 불법정보 또는 유해한 콘텐츠를 생성·유포하는 행위</li>
        <li>미성년자 또는 취약한 사람을 착취하거나 해치는 행위</li>
        <li>서비스의 보안, 네트워크 또는 정상적인 운영을 방해하는 행위</li>
        <li>허용되지 않은 자동화 수단으로 서비스나 데이터에 접근하는 행위</li>
        <li>그 밖에 서비스 화면에 게시된 모델 라이선스의 금지 용도를 위반하는 행위</li>
      </ul>
    </section>
  </>
)
