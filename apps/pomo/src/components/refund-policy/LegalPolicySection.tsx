import {CONTENT_LINK_CLASSES, HEADING_CLASSES, PARAGRAPH_CLASSES, SECTION_CLASSES} from './shared'

export const LegalPolicySection = () => (
  <section class={SECTION_CLASSES} id="disputes">
    <h2 class={HEADING_CLASSES}>6. 증명, 분쟁 및 법령의 우선 적용</h2>
    <p class={PARAGRAPH_CLASSES}>
      계약 체결·공급 시기, 음악 재생 개시 여부 등 청약철회 제한과 관련하여 다툼이 있는 경우 관계
      법령에 따라 쿠웅이 필요한 사실을 증명합니다.
    </p>
    <p class={PARAGRAPH_CLASSES}>
      이 정책은{' '}
      <a
        class={CONTENT_LINK_CLASSES}
        href="https://www.law.go.kr/법령/전자상거래등에서의소비자보호에관한법률"
        rel="noreferrer"
        target="_blank"
      >
        「전자상거래 등에서의 소비자보호에 관한 법률」
      </a>{' '}
      제17조 및 제18조를 기본으로 하며, 「콘텐츠산업 진흥법」, 「소비자기본법」 및
      소비자분쟁해결기준 등 적용되는 관계 법령을 따릅니다. 이 정책은 관계 법령이 보장하는 소비자의
      권리를 제한하지 않습니다.
    </p>
  </section>
)
