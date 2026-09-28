/** @vitest-environment node */
import {expect, it} from 'vitest'

import {createKoreanTextSegments} from '../features/korean-text-postprocessor/logic'

it('should keep decimal numbers inside one visible sentence segment', () => {
  expect(createKoreanTextSegments('3.14는 원주율입니다.')).toEqual([
    {kind: 'text', text: '3.14는 원주율입니다.'},
  ])
})

it('should keep URL hostnames inside one visible sentence segment', () => {
  expect(createKoreanTextSegments('https://example.com 에서 확인하세요.')).toEqual([
    {kind: 'text', text: 'https://example.com 에서 확인하세요.'},
  ])
})
