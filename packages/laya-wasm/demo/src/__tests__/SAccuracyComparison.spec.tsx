/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {SAccuracyComparison} from '../SAccuracyComparison'
import type {EvaluationComparison} from '../types'

afterEach(cleanup)
it('should show counts, percentage-point changes and predictions then clear when data is removed', () => {
  const [comparison, setComparison] = createSignal<EvaluationComparison | null>({
    after: {
      correct: 1,
      meanLoss: 0.2,
      rows: [
        {correct: true, expected: '송금 실패', predicted: '송금 실패', state: '보내기가 안 돼요'},
      ],
      total: 1,
    },
    before: {
      correct: 0,
      meanLoss: 1.5,
      rows: [
        {
          correct: false,
          expected: '송금 실패',
          predicted: '카드 분실·도난',
          state: '보내기가 안 돼요',
        },
      ],
      total: 1,
    },
  })
  render(() => <SAccuracyComparison comparison={comparison()} />)
  expect(screen.getByRole('status', {name: '학습 전 정확도'}).textContent).toBe('0.0% (0/1)')
  expect(screen.getByRole('status', {name: '학습 후 정확도'}).textContent).toBe('100.0% (1/1)')
  expect(screen.getByRole('status', {name: '정확도 변화'}).textContent).toBe('+100.0%p')
  expect(screen.getByRole('status', {name: '학습 전 평균 손실'}).textContent).toBe('1.5000')
  expect(screen.getByRole('status', {name: '학습 후 평균 손실'}).textContent).toBe('0.2000')
  setComparison(null)
  expect(screen.queryByRole('status', {name: '학습 후 정확도'})).toBeNull()
})
