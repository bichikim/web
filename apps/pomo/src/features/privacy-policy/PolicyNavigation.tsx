import {CONTENT_LINK_CLASSES} from './shared'

export const PolicyNavigation = () => (
  <nav aria-label="개인정보처리방침 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#controller">
          1. 개인정보처리자
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#data">
          2. 처리 항목과 목적
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#local-data">
          3. 기기 내 정보
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#retention">
          4. 보유기간
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#sharing">
          5. 제3자 제공
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#processors">
          6. 처리위탁
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#overseas">
          7. 국외 이전
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#rights">
          8. 이용자의 권리
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#deletion">
          9. 파기
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#automatic">
          10. 자동 수집과 보안
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#children">
          11. 아동의 개인정보
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#contact">
          12. 문의와 변경
        </a>
      </li>
    </ol>
  </nav>
)
