// oxlint-disable eslint-js/camelcase -- Transformers.js decoder options are fixed external contracts.

import type {TextTokenVocabulary} from '../text-generation/runtime'

const FOREIGN_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Latin}]/u

/** Finds vocabulary tokens that could introduce Latin or Han characters into an answer. */
export const createForeignTokenIds = (tokenizer: TextTokenVocabulary): Array<number> => {
  const specialTokenIds = new Set(tokenizer.all_special_ids)

  return [...tokenizer.get_vocab().values()].filter((tokenId) => {
    if (specialTokenIds.has(tokenId)) {
      return false
    }

    const text = tokenizer.decode([tokenId], {skip_special_tokens: false})
    return FOREIGN_CHARACTER_PATTERN.test(text)
  })
}
