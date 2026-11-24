import {expect, it} from 'vitest'
import {segmentText} from '../segment-text'

it('should keep two sentences together and preserve paragraph and source offsets', () => {
  const text =
    '  실패해서 속상했어요. 자신감도 없었고요. 그래도 다시 해봤어요. 이번엔 성공했어요!\n\n정말 고마워요.'
  const segments = segmentText({text})
  expect(segments.map((segment) => segment.text)).toEqual([
    '실패해서 속상했어요. 자신감도 없었고요.',
    '그래도 다시 해봤어요. 이번엔 성공했어요!',
    '정말 고마워요.',
  ])
  expect(segments.every((segment) => text.slice(segment.start, segment.end) === segment.text)).toBe(
    true,
  )
  expect(segments.every((segment) => segment.complete)).toBe(true)
})

it('should leave unfinished streaming tails unclassified and retain completed segment boundaries', () => {
  const text = 'It failed. I felt sad. But I tried'
  const initial = segmentText({complete: false, text})
  expect(initial.map((segment) => segment.complete)).toEqual([true, false])
  const updated = segmentText({complete: false, text: `${text} again. It worked!`})
  expect(updated[0]).toEqual(initial[0])
  expect(updated[1].complete).toBe(true)
  expect(segmentText({complete: false, text: '아직 작성 중'})[0].complete).toBe(false)
  expect(segmentText({text: '마침표 없는 완성된 답변'})[0].complete).toBe(true)
})

it('should retain quotes and decimal numbers while bounding unpunctuated prose', () => {
  const text = '“실패한 게 아니에요.” 값은 3.14예요. 이제 다음 내용을 설명할게요.'
  const segments = segmentText({text})
  expect(segments[0].text).toBe('“실패한 게 아니에요.” 값은 3.14예요.')
  const long = '아주 긴 설명 문장입니다 '.repeat(70)
  const bounded = segmentText({text: long})
  expect(bounded.length).toBeGreaterThan(1)
  expect(bounded.every((segment) => segment.text.length <= 320)).toBe(true)
  expect(bounded.map((segment) => segment.text).join(' ')).toBe(long.trim())
  expect(segmentText({text: '\n  \n'})).toEqual([])
})
