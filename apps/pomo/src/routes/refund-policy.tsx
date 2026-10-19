import {getLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'

import {A} from '@solidjs/router'
import {cx} from 'class-variance-authority'
import {Show} from 'solid-js'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  PServicePolicyDocument,
  type ServicePolicyContentsItem,
} from 'src/components/p-service-policy-document/PServicePolicyDocument'
import {EnglishRefundPolicyContent} from 'src/components/refund-policy/EnglishRefundPolicyContent'
import {PurchasePolicySections} from '../components/refund-policy/PurchasePolicySections'
import {RefundProcessSections} from '../components/refund-policy/RefundProcessSections'
import {LegalPolicySection} from '../components/refund-policy/LegalPolicySection'
import {CONTENT_LINK_CLASSES} from '../components/refund-policy/shared'

const FOOTER_CLASSES = cx(
  'grid gap-3 border-t border-white/8 pt-6 text-xs leading-6 text-#8f8297',
  'sm:flex sm:items-end sm:justify-between',
)

const CONTENT_ITEMS = [
  {id: 'music-license', label: '1. 음악 이용권'},
  {id: 'withdrawal', label: '2. 청약철회'},
  {id: 'nonconforming', label: '3. 계약과 다른 제공'},
  {id: 'request', label: '4. 신청 및 처리 방법'},
  {id: 'refund', label: '5. 환불 시점'},
  {id: 'disputes', label: '6. 증명, 분쟁 및 법령'},
] satisfies ReadonlyArray<ServicePolicyContentsItem>

const renderKoreanRefundPolicy = () => (
  <PServicePolicyDocument
    appReturnLink={
      <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
        <span aria-hidden="true">←</span> {m.app_return()}
      </A>
    }
    appReturnLinkPosition="before-policy"
    contents={CONTENT_ITEMS}
    contentsLabel="환불 정책 목차"
    contentsTitle="Contents"
    currentPolicy="refund"
    description="앱인토스에서 1회 결제로 판매하는 곡·앨범 단위 음악 이용권의 청약철회와 환불 기준을 안내합니다."
    eyebrow="Consumer refund policy"
    footer={
      <>
        <div>
          <p class="m-0 font-700 text-#a99cab">환불 접수 및 문의</p>
          <p class="mb-0 mt-1">
            <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
              {SERVICE_OPERATOR.supportEmail}
            </a>
          </p>
        </div>
        <span>© Pomofi</span>
      </>
    }
    footerClass={FOOTER_CLASSES}
    metadata={<p class="mb-0 mt-3 text-xs text-#a99cab">시행일 2026년 8월 22일 · 문서 버전 1.1</p>}
    platform="apps-in-toss"
    title="Pomofi 환불 및 청약철회 정책"
  >
    <PurchasePolicySections />
    <RefundProcessSections />
    <LegalPolicySection />
  </PServicePolicyDocument>
)

export default function RefundPolicyPage() {
  return (
    <Show fallback={renderKoreanRefundPolicy()} when={getLocale() === 'en'}>
      <EnglishRefundPolicyContent />
    </Show>
  )
}
