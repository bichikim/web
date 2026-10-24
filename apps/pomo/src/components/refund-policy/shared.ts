import {cx} from 'class-variance-authority'

export const SECTION_CLASSES = 'scroll-mt-8 border-t border-white/8 pt-8 first:border-0 first:pt-0'

export const HEADING_CLASSES = 'm-0 text-xl font-750 tracking--0.02em text-#f8edf1'

export const PARAGRAPH_CLASSES =
  'mb-0 mt-3 text-sm leading-7 text-#d8cbd9 xs:text-base xs:leading-8'

export const EMPHASIS_CLASSES = 'font-750 text-#ffd4de'

export const CONTENT_LINK_CLASSES = cx(
  'text-#d8cbd9 underline decoration-white/25 underline-offset-4 transition-colors',
  'hover:text-white focus-visible:text-white',
)
