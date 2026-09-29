/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createKoreanTextSegments} from '../features/korean-text-postprocessor/logic'

it('should keep English honorific abbreviations in the same sentence', () => {
  expect(createKoreanTextSegments('Mr. Kim은 회의에 참석했습니다.')).toEqual([
    {kind: 'text', text: 'Mr. Kim은 회의에 참석했습니다.'},
  ])
})

it('should not strip honorific context from CJK refinement segments', () => {
  expect(createKoreanTextSegments('Mr. Smith은 人生입니다.')).toEqual([
    {kind: 'refining', text: 'Mr. Smith은 人生입니다.'},
  ])
})

it('should keep numbered list markers inside each list sentence', () => {
  expect(createKoreanTextSegments('1. 첫 번째입니다. 2. 두 번째입니다.')).toEqual([
    {kind: 'text', text: '1. 첫 번째입니다.'},
    {kind: 'text', text: ' 2. 두 번째입니다.'},
  ])
})
