import {Tokenizer} from '@huggingface/tokenizers'
import {expect, it} from 'vitest'
import {resolveSpecialTokens} from '../index'

const tokenizer = new Tokenizer(
  {
    added_tokens: [],
    decoder: null,
    model: {
      continuing_subword_prefix: '##',
      max_input_chars_per_word: 100,
      type: 'WordPiece',
      unk_token: '<unk>',
      vocab: {'</s>': 2, '<mask>': 3, '<pad>': 0, '<s>': 1, '<unk>': 4},
    },
    normalizer: null,
    post_processor: null,
    pre_tokenizer: {type: 'Whitespace'},
  },
  {},
)

it('should read token names and AddedToken objects from tokenizer configuration', () => {
  expect(
    resolveSpecialTokens(tokenizer, {
      cls_token: '<s>',
      mask_token: {content: '<mask>'},
      pad_token: '<pad>',
      sep_token: '</s>',
    }),
  ).toEqual({cls: 1, mask: 3, maskToken: '<mask>', pad: 0, sep: 2})
})

it('should reject missing special tokens instead of inserting an unknown ID', () => {
  expect(() => resolveSpecialTokens(tokenizer, {})).toThrow(/Missing special token/)
})
