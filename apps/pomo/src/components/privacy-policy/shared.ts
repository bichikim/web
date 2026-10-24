import {cx} from 'class-variance-authority'

export const SECTION_CLASSES = 'scroll-mt-8 border-t border-white/8 pt-8 first:border-0 first:pt-0'

export const HEADING_CLASSES = 'm-0 text-xl font-750 tracking--0.02em text-#f8edf1'

export const PARAGRAPH_CLASSES =
  'mb-0 mt-3 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'

export const LIST_CLASSES =
  'mb-0 mt-4 grid list-disc gap-2 pl-5 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'

export const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)

export const CARD_CLASSES = 'mt-4 rounded-5 border border-white/10 bg-white/4 p-5'

export const CARD_HEADING_CLASSES = 'm-0 text-base font-750 text-#ffd4de'

export type PrivacyPolicyPlatform = 'apps-in-toss' | 'web'

export interface PPrivacyPolicyProps {
  backHref?: string
  backLabel?: string
  platform?: PrivacyPolicyPlatform
}
