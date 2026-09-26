import {createTokenIdsMatching} from '../text-generation/create-token-ids-matching'
// oxlint-disable eslint-js/camelcase -- Transformers.js decoder options are fixed external contracts.

import type {TextTokenVocabulary} from '../text-generation/runtime'

const FOREIGN_CHARACTER_PATTERN = /[\p{Script=Han}\p{Script=Latin}]/u

/** Finds vocabulary tokens that could introduce Latin or Han characters into an answer. */
export const createForeignTokenIds = (tokenizer: TextTokenVocabulary): Array<number> =>
  createTokenIdsMatching(tokenizer, (text) => FOREIGN_CHARACTER_PATTERN.test(text))
