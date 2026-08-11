import {describe, expect, it} from 'vitest'

import {createForeignTokenIds} from '../foreign-tokens'
import type {TextTokenVocabulary} from '../../text-generation/runtime'

const createTokenizer = (): TextTokenVocabulary => {
  const tokens = new Map([
    ['<eos>', 0],
    ['한글', 1],
    ['AI', 2],
    ['活动', 3],
    ['123', 4],
    ['한글.', 5],
    ['SNS와', 6],
  ])
  const decodedTokens = new Map([
    [0, '<eos>'],
    [1, '한글'],
    [2, 'AI'],
    [3, '活动'],
    [4, '123'],
    [5, ' 한글.'],
    [6, ' SNS와'],
  ])

  return {
    all_special_ids: [0],
    decode: ([tokenId]) => decodedTokens.get(tokenId ?? -1) ?? '',
    get_vocab: () => tokens,
  }
}

describe('createForeignTokenIds', () => {
  it('should suppress tokens containing Latin or Han characters', () => {
    expect(createForeignTokenIds(createTokenizer())).toEqual([2, 3, 6])
  })
})
