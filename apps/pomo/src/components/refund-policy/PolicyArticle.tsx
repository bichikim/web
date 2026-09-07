import {cx} from 'class-variance-authority'
import {LegalPolicySection} from './LegalPolicySection'
import {PurchasePolicySections} from './PurchasePolicySections'
import {RefundProcessSections} from './RefundProcessSections'

const ARTICLE_CLASSES = cx(
  'rounded-8 border border-white/10 bg-#211a2b/88 p-5',
  'shadow-[0_1.75rem_6.25rem_rgba(5,2,10,0.38)] backdrop-blur-xl xs:p-8 lg:p-10',
)

export const PolicyArticle = () => (
  <article class={ARTICLE_CLASSES}>
    <div class="grid gap-8">
      <PurchasePolicySections />
      <RefundProcessSections />
      <LegalPolicySection />
    </div>
  </article>
)
