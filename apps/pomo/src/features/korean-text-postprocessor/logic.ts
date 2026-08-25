// oxlint-disable eslint-js/camelcase -- Transformers.js tokenizer options are fixed external contracts.

import type {TextTokenVocabulary} from '../text-generation/runtime'

const FOREIGN_CJK_PATTERN = /[\p{Script_Extensions=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u
const SENTENCE_PATTERN = /[^.!?\n。！？]+[.!?\n。！？]*|[.!?\n。！？]+/gu
const REFINEMENT_FALLBACK = '답변의 일부 표현을 자연스러운 한국어로 바꾸지 못했어요.'

interface RefiningKoreanTextSegment {
  readonly kind: 'refining'
  readonly text: string
}

interface VisibleKoreanTextSegment {
  readonly kind: 'text'
  readonly text: string
}

export type KoreanTextSegment = RefiningKoreanTextSegment | VisibleKoreanTextSegment

interface KoreanRefinementMessage {
  readonly content: string
  readonly role: 'system' | 'user'
}

export const containsForeignCjk = (text: string): boolean => FOREIGN_CJK_PATTERN.test(text)

/** Splits generated text into visible and temporarily concealed sentences. */
export const createKoreanTextSegments = (text: string): ReadonlyArray<KoreanTextSegment> =>
  (text.match(SENTENCE_PATTERN) ?? []).map((sentence) => ({
    kind: containsForeignCjk(sentence) ? 'refining' : 'text',
    text: sentence,
  }))

/** Creates a constrained second-pass prompt that preserves meaning in Korean. */
export const createKoreanRefinementMessages = (text: string): Array<KoreanRefinementMessage> => [
  {
    content: '의미·말투·형식을 유지해 외국 문자를 자연스러운 한국어로 바꾸고 결과만 출력하세요.',
    role: 'system',
  },
  {content: text, role: 'user'},
]

/** Finds tokenizer entries that could reintroduce CJK characters during refinement. */
export const createForeignCjkTokenIds = (tokenizer: TextTokenVocabulary): Array<number> => {
  const specialTokenIds = new Set(tokenizer.all_special_ids)

  return [...tokenizer.get_vocab().values()].filter((tokenId) => {
    if (specialTokenIds.has(tokenId)) {
      return false
    }

    const text = tokenizer.decode([tokenId], {skip_special_tokens: false})
    return containsForeignCjk(text)
  })
}

/** Replaces unresolved foreign-script sentences with a safe Korean fallback. */
export const replaceUnrefinedSentences = (text: string): string =>
  createKoreanTextSegments(text)
    .map((segment) => {
      if (segment.kind === 'text') {
        return segment.text
      }

      const [leadingWhitespace] = segment.text.match(/^\s*/u)!
      return `${leadingWhitespace}${REFINEMENT_FALLBACK}`
    })
    .join('')
