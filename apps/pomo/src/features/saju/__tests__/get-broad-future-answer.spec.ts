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
