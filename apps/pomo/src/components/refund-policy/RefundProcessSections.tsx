import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  CONTENT_LINK_CLASSES,
  EMPHASIS_CLASSES,
  HEADING_CLASSES,
  PARAGRAPH_CLASSES,
  SECTION_CLASSES,
} from './shared'

const LIST_CLASSES =
  'mb-0 mt-4 grid list-disc gap-2 pl-5 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'

export const RefundProcessSections = () => (
  <>
    <section class={SECTION_CLASSES} id="nonconforming">
      <h2 class={HEADING_CLASSES}>3. 표시·광고 또는 계약과 다른 제공</h2>
      <p class={PARAGRAPH_CLASSES}>
        음악 이용권이 표시·광고 내용과 다르거나 계약내용과 다르게 제공된 경우 소비자는 공급받은
        날부터 <strong class={EMPHASIS_CLASSES}>3개월 이내</strong>이면서 그 사실을 안 날 또는 알 수
        있었던 날부터 <strong class={EMPHASIS_CLASSES}>30일 이내</strong>에 청약철회 또는 계약
        이행을 요구할 수 있습니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi의 책임으로 구매한 음악을 이용할 수 없고 합리적인 기간 안에 복구되지 않은 경우에는
        관계 법령과 소비자분쟁해결기준에 따라 환불 또는 이에 상응하는 조치를 제공합니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="request">
      <h2 class={HEADING_CLASSES}>4. 신청 및 처리 방법</h2>
      <ul class={LIST_CLASSES}>
        <li>
          Android 결제는 토스 앱의 환불 신청 절차를 이용하며, 쿠웅의 검토 후 Google Play에서 최종
          처리합니다.
        </li>
        <li>iOS 결제의 환불 신청과 결정은 Apple의 환불 절차에 따릅니다.</li>
        <li>
          절차 안내나 추가 지원이 필요하면 주문번호 또는 결제 식별정보와 구매 상품을{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
          로 보내 문의할 수 있습니다.
        </li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅은 환불 처리에 필요한 최소 정보만 요청하며, 신청 접수 및 처리 결과는 앱인토스 또는
        운영체제별 앱 마켓이 제공하는 방법으로 안내될 수 있습니다.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="refund">
      <h2 class={HEADING_CLASSES}>5. 환불 시점</h2>
      <p class={PARAGRAPH_CLASSES}>
        쿠웅이 직접 환급할 의무가 있는 경우 청약철회 또는 환불 신청을 받은 날부터{' '}
        <strong class={EMPHASIS_CLASSES}>3영업일 이내</strong>에 결제금액을 환급하거나 환급에 필요한
        조치를 합니다. 법정 기한을 넘긴 경우에는 관계 법령에 따른 지연배상금을 지급합니다.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        앱 마켓이 환불을 처리하는 경우 실제 취소 또는 입금 시점은 해당 앱 마켓과 결제수단의 처리
        일정에 따라 달라질 수 있습니다. 환불이 완료되면 해당 음악 이용권은 회수될 수 있습니다.
      </p>
    </section>
  </>
)
