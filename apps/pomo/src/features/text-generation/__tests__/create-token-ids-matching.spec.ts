// oxlint-disable eslint-js/camelcase -- Tokenizer options follow the external model contract.
import {expect, it, vi} from 'vitest'
import {createTokenIdsMatching} from '../create-token-ids-matching'

it('should exclude special ids before decoding and preserve vocabulary order', () => {
  const decode = vi.fn(([id]: ReadonlyArray<number>) => String(id))
  const tokenizer = {
    all_special_ids: [0],
    decode,
    get_vocab: () =>
      new Map([
        ['special', 0],
        ['two', 2],
        ['one', 1],
      ]),
  }
  expect(createTokenIdsMatching(tokenizer, (text) => text !== '1')).toEqual([2])
  expect(decode.mock.calls.map(([ids]) => ids)).toEqual([[2], [1]])
  expect(createTokenIdsMatching({...tokenizer, get_vocab: () => new Map()}, () => true)).toEqual([])
})
