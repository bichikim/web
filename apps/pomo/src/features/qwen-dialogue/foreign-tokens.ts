// oxlint-disable eslint-js/camelcase -- Transformers.js decoder options are fixed external contracts.

const FOREIGN_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Latin}]/u

export interface QwenTokenVocabulary {
  readonly all_special_ids: ReadonlyArray<number>
  readonly decode: (
    tokenIds: Array<number>,
    options: {readonly skip_special_tokens: boolean},
  ) => string
  readonly get_vocab: () => Map<string, number>
}

/** Finds vocabulary tokens that could introduce Latin or Han characters into an answer. */
export const createForeignTokenIds = (tokenizer: QwenTokenVocabulary): Array<number> => {
  const specialTokenIds = new Set(tokenizer.all_special_ids)

  return [...tokenizer.get_vocab().values()].filter((tokenId) => {
    if (specialTokenIds.has(tokenId)) {
      return false
    }

    const text = tokenizer.decode([tokenId], {skip_special_tokens: false})
    return FOREIGN_CHARACTER_PATTERN.test(text)
  })
}
