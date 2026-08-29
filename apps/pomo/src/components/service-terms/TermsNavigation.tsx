import {CONTENT_LINK_CLASSES} from './shared'

export const TermsNavigation = () => (
  <nav aria-label="서비스 이용약관 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#purpose">
          1. 목적과 적용 범위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#definitions">
          2. 용어의 정의
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#agreement">
          3. 약관의 효력과 변경
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#service">
          4. 서비스의 내용
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#platform">
          5. 이용 환경
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#account">
          6. 계정과 이용자의 의무
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#ai-voice">
          7. AI 음성 기능
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#restricted-uses">
          8. 금지 행위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#rights">
          9. 콘텐츠와 권리
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#payment">
          10. 결제와 환불
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#availability">
          11. 변경과 중단
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#termination">
          12. 이용 종료
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#responsibility">
          13. 책임 범위
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#disputes">
          14. 문의와 분쟁 해결
        </a>
      </li>
    </ol>
  </nav>
)
