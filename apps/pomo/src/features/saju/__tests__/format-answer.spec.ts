import {expect, it} from 'vitest'
import {formatSajuAnswer} from '../format-answer'

it.each([
  '아래 내용을 참고해 보면, ',
  '위 자료에 따르면 ',
  '항목을 정리해 보면 ',
  '제공된 정보를 바탕으로 보면, ',
  '확인한 내용을 종합하면 ',
  '전체적인 흐름을 보면\n\n',
  '흐름을 살펴보면 ',
  '위 자료에 따르면, 아래 내용을 참고해 보면 ',
])('should remove the reference opening %j and preserve the paragraphs', (opening) => {
  const body = '지출을 정리할 때 우선순위를 정해 보세요.\n\n함께 결정할 일은 미리 상의해 보세요.'
  expect(formatSajuAnswer(`${opening}${body}`)).toBe(body)
})

it.each([
  '돈을 쓸 때는 필요한 지출을 먼저 챙겨 보세요.',
  '이직을 생각하신다면 지금 맡은 일부터 돌아보세요.',
  '일간은 병(丙)입니다. 태어난 날의 첫 글자입니다.',
  '함께 결정할 일을 먼저 정해 보세요.\n\n사주를 살펴보면이라는 말로 시작할 필요는 없어요.',
  '사주를 살펴보면 맡은 일을 끝까지 챙기려는 면이 읽혀요. 그래서 일의 범위를 정하는 것이 중요해요.',
  '사주를 종합해 보면 생각을 표현하는 쪽이 눈에 띄어요. 아이디어를 정리해 전하는 일에 잘 맞는 편이에요.',
  '',
])('should preserve an ordinary answer or an explicitly requested term: %j', (text) => {
  expect(formatSajuAnswer(text)).toBe(text)
})

it('should remove an input reference while retaining the following chart interpretation', () => {
  const reading =
    '사주를 살펴보면 생각을 표현하는 쪽이 눈에 띄어요. 그래서 기록하는 습관이 도움이 돼요.'
  expect(formatSajuAnswer(`아래 내용을 참고해 보면, ${reading}`)).toBe(reading)
})

it.each(['아래 내용을 참고해 보면, ', '전체적인 흐름을 보면\n\n'])(
  'should preserve a nonempty response when removing its opening would leave no answer: %j',
  (text) => {
    expect(formatSajuAnswer(text)).toBe(text)
  },
)
