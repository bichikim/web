// oxlint-disable eslint-js/camelcase -- Tokenizer properties are an external contract.
import type {TextTokenVocabulary} from './runtime'

/** Finds matching decoded vocabulary entries, excluding special tokens. */
export const createTokenIdsMatching = (
  tokenizer: TextTokenVocabulary,
  matches: (text: string) => boolean,
): Array<number> => {
  const specialTokenIds = new Set(tokenizer.all_special_ids)
  return [...tokenizer.get_vocab().values()].filter(
    (tokenId) =>
      !specialTokenIds.has(tokenId) &&
      matches(tokenizer.decode([tokenId], {skip_special_tokens: false})),
  )
}
