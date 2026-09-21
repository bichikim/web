import {A} from '@solidjs/router'

import {SERVICE_OPERATOR} from 'src/features/service-operator'
import {
  PServicePolicyDocument,
  type ServicePolicyContentsItem,
} from '../p-service-policy-document/PServicePolicyDocument'
import {
  CONTENT_LINK_CLASSES,
  EMPHASIS_CLASSES,
  HEADING_CLASSES,
  PARAGRAPH_CLASSES,
  SECTION_CLASSES,
} from './shared'

const LIST_CLASSES =
  'mb-0 mt-4 grid list-disc gap-2 pl-5 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'

const CONTENT_ITEMS = [
  {id: 'music-license', label: '1. Music access pass'},
  {id: 'withdrawal', label: '2. Withdrawal'},
  {id: 'nonconforming', label: '3. Different from the contract'},
  {id: 'request', label: '4. How to apply'},
  {id: 'refund', label: '5. Refund timing'},
  {id: 'disputes', label: '6. Evidence and disputes'},
] as const satisfies ReadonlyArray<ServicePolicyContentsItem>

const EnglishRefundPolicySections = () => (
  <>
    <section class={SECTION_CLASSES} id="music-license">
      <h2 class={HEADING_CLASSES}>1. Music access pass</h2>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi sells music access passes for individual tracks or albums in Apps in Toss as one-time
        purchases. The pass has no recurring payment or automatic renewal, and the purchased Apps in
        Toss account may use the music while the Pomofi service remains available.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        A music access pass does not transfer ownership of an audio file or intellectual property
        rights. Pomofi does not provide audio-file downloads, and a pass cannot be transferred to
        another account or person.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        The price, eligible tracks or albums, included content, and usage conditions are shown
        before purchase. If Pomofi ends the service and can no longer provide music that was
        purchased, it will respond under applicable law and consumer-dispute standards.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="withdrawal">
      <h2 class={HEADING_CLASSES}>2. Withdrawal</h2>
      <p class={PARAGRAPH_CLASSES}>
        A consumer may request withdrawal within <strong class={EMPHASIS_CLASSES}>7 days</strong>{' '}
        after receiving the electronic document describing the contract. If the music pass is
        activated later, the request may be made within 7 days after activation.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        Once playback of purchased music begins, delivery of the digital content may be considered
        to have started, so withdrawal may be restricted. Before purchase, Pomofi clearly explains
        the restriction, obtains any consent required by law, and provides a preview or equivalent
        information.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        If the required advance notice, consent, or trial method was not provided, this policy does
        not restrict a withdrawal right guaranteed by applicable law.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="nonconforming">
      <h2 class={HEADING_CLASSES}>3. Different from advertising or the contract</h2>
      <p class={PARAGRAPH_CLASSES}>
        If a music pass differs from its advertising or contract terms, a consumer may request
        withdrawal or performance within <strong class={EMPHASIS_CLASSES}>3 months</strong> after
        receiving it and within <strong class={EMPHASIS_CLASSES}>30 days</strong> after learning, or
        being able to learn, that fact.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        If music cannot be used because of Pomofi and is not restored within a reasonable period,
        Pomofi provides a refund or equivalent remedy under applicable law and consumer-dispute
        standards.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="request">
      <h2 class={HEADING_CLASSES}>4. How to apply and how it is handled</h2>
      <ul class={LIST_CLASSES}>
        <li>
          For Android purchases, use the refund process in the Toss app. After Pomofi&apos;s review,
          Google Play completes the final processing.
        </li>
        <li>For iOS purchases, Apple&apos;s refund process governs the request and decision.</li>
        <li>
          For procedural guidance or additional support, email the order number or payment
          identifier and the purchased item to{' '}
          <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
            {SERVICE_OPERATOR.supportEmail}
          </a>
          .
        </li>
      </ul>
      <p class={PARAGRAPH_CLASSES}>
        Pomofi requests only the minimum information needed to process a refund. The Apps in Toss
        environment or the app store for the relevant operating system may provide updates about
        receipt and processing results.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="refund">
      <h2 class={HEADING_CLASSES}>5. Refund timing</h2>
      <p class={PARAGRAPH_CLASSES}>
        When Pomofi is directly responsible for a refund, it refunds the payment or takes the
        necessary steps within <strong class={EMPHASIS_CLASSES}>3 business days</strong> after
        receiving the withdrawal or refund request. If the statutory period is exceeded, delayed
        compensation is paid as required by applicable law.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        When an app store processes the refund, the actual cancellation or deposit timing may vary
        according to the app store and payment method. After a refund is completed, the related
        music access pass may be withdrawn.
      </p>
    </section>

    <section class={SECTION_CLASSES} id="disputes">
      <h2 class={HEADING_CLASSES}>6. Evidence, disputes, and governing law</h2>
      <p class={PARAGRAPH_CLASSES}>
        If there is a dispute about a withdrawal restriction, such as when a contract was formed,
        when delivery occurred, or whether playback began, Pomofi provides the necessary evidence
        under applicable law.
      </p>
      <p class={PARAGRAPH_CLASSES}>
        This policy is based on Articles 17 and 18 of the{' '}
        <a
          class={CONTENT_LINK_CLASSES}
          href="https://www.law.go.kr/%EB%B2%95%EB%A0%B9/%EC%A0%84%EC%9E%90%EC%83%81%EA%B1%B0%EB%9E%98%EB%93%B1%EC%97%90%EC%84%9C%EC%9D%98%EC%86%8C%EB%B9%84%EC%9E%90%EB%B3%B4%ED%98%B8%EC%97%90%EA%B4%80%ED%95%9C%EB%B2%95%EB%A5%A0"
          rel="noreferrer"
          target="_blank"
        >
          Electronic Commerce Consumer Protection Act
        </a>{' '}
        and follows other applicable laws, including the Content Industry Promotion Act, the
        Framework Act on Consumers, and consumer-dispute standards. It does not limit consumer
        rights guaranteed by applicable law.
      </p>
    </section>
  </>
)

const EnglishRefundPolicyFooter = () => (
  <>
    <div>
      <p class="m-0 font-700 text-#a99cab">Refund requests and inquiries</p>
      <p class="mb-0 mt-1">
        <a class={CONTENT_LINK_CLASSES} href={`mailto:${SERVICE_OPERATOR.supportEmail}`}>
          {SERVICE_OPERATOR.supportEmail}
        </a>
      </p>
    </div>
    <span>© Pomofi</span>
  </>
)

export const EnglishRefundPolicyContent = () => (
  <PServicePolicyDocument
    appReturnLink={
      <A class="w-fit text-sm font-700 text-#d8cbd9 no-underline hover:text-white" href="/">
        <span aria-hidden="true">←</span> Return to app
      </A>
    }
    appReturnLinkPosition="before-policy"
    contents={CONTENT_ITEMS}
    contentsLabel="Refund policy contents"
    contentsTitle="Contents"
    currentPolicy="refund"
    description={
      <>
        This policy explains withdrawal and refund rules for music access passes sold as one-time
        purchases for individual tracks or albums in Apps in Toss.
      </>
    }
    eyebrow="Consumer refund policy"
    footer={<EnglishRefundPolicyFooter />}
    metadata={
      <p class="mb-0 mt-3 text-xs text-#a99cab">Effective August 22, 2026 · Document version 1.1</p>
    }
    platform="apps-in-toss"
    title="Pomofi consumer refund and withdrawal policy"
  >
    <EnglishRefundPolicySections />
  </PServicePolicyDocument>
)
