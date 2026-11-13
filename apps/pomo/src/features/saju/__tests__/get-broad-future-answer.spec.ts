import {expect, it} from 'vitest'

import {getBroadFutureAnswer} from '../get-broad-future-answer'

it('should answer broad future questions by asking for a specific topic', () => {
  expect(getBroadFutureAnswer('나의 미래는 ?')).toContain('재물, 일, 관계')
  expect(getBroadFutureAnswer('제 미래는 어떻게 될까요?')).toContain('미래에 어떤 일이 일어날지')
  expect(getBroadFutureAnswer('앞으로 어떻게 될까요?')).not.toBeNull()
  expect(getBroadFutureAnswer('앞으로 내 인생 괜찮을까?')).not.toBeNull()
  expect(getBroadFutureAnswer('내 인생은 앞으로 어떻게 될까?')).not.toBeNull()
})

it('should leave questions with a specific topic to the reading flow', () => {
  expect(getBroadFutureAnswer('미래의 재물운은?')).toBeNull()
  expect(getBroadFutureAnswer('내 사업의 미래는?')).toBeNull()
  expect(getBroadFutureAnswer('미래에 어떤 직업이 좋을까요?')).toBeNull()
})

it.each([
  '미래는 어떨까요?',
  '앞날은 어떨까요?',
  '내 앞날은 어떨까요?',
  '미래는 어떨까?',
  '미래 좀 알려줘',
  '운세 좀 봐줘',
  '미래 좀 알려주세요.',
  '운세 좀 봐주세요!',
  '  제 미래는   좀   알려줘 ?  ',
  '미래 알려줘',
  '운세 봐주세요',
])('should ask for a specific topic for an equivalent broad future expression: %s', (question) => {
  expect(getBroadFutureAnswer(question)).toBe(getBroadFutureAnswer('제 미래는 어떻게 될까요?'))
})

it.each([
  '',
  '제 일은 어떨까요?',
  '미래의 재물운은 어떨까요?',
  '내 사업의 미래는 어떨까요?',
  '미래 재물운 좀 알려줘',
  '운세 중 연애운 좀 봐줘',
  '미래 좀 알려줘, 특히 직업이 궁금해',
  '미래 좀 더 알려줘',
  '과거는 어떨까요?',
  '운세는 어땠나요?',
  '올해 운세는 어떨까요?',
  '내년 운세 좀 봐줘',
  '2026년 미래 좀 알려줘',
])(
  'should leave specific, past, annual and other unmatched questions unchanged: %s',
  (question) => {
    expect(getBroadFutureAnswer(question)).toBeNull()
  },
)
