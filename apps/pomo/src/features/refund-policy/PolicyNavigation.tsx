import {CONTENT_LINK_CLASSES} from './shared'

export const PolicyNavigation = () => (
  <nav aria-label="환불 정책 목차" class="lg:sticky lg:top-8 lg:self-start">
    <p class="m-0 text-xs font-750 tracking-[0.18em] text-#8f8297 uppercase">Contents</p>
    <ol class="mb-0 mt-4 grid list-none gap-3 p-0 text-sm">
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#music-license">
          1. 음악 이용권
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#withdrawal">
          2. 청약철회
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#nonconforming">
          3. 계약과 다른 제공
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#request">
          4. 신청 및 처리 방법
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#refund">
          5. 환불 시점
        </a>
      </li>
      <li>
        <a class={CONTENT_LINK_CLASSES} href="#disputes">
          6. 증명, 분쟁 및 법령
        </a>
      </li>
    </ol>
  </nav>
)
