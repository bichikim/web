/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {STraining} from '../STraining'

afterEach(cleanup)

it('should apply the Korean experiment settings and send the displayed values to training', () => {
  const [busy, setBusy] = createSignal(false)
  const train = vi.fn()
  const prompt = {
    question: {criteria: ['a', 'b'], instructions: 'Pick', type: 'choice'},
    state: 'x',
  } as const
  render(() => (
    <STraining
      editor={{prompt: () => prompt}}
      lab={{
        busy,
        cancel: vi.fn(),
        cancelling: () => false,
        dataset: () => [{example: {...prompt, target: [1, 0]}, id: 1, label: 'a'}],
        evaluation: {importing: () => false},
        evaluationProgress: () => null,
        loaded: () => true,
        losses: () => [],
        outcome: () => 'idle',
        phase: () => 'ready',
        reportError: vi.fn(),
        total: () => 0,
        train,
      }}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '한국어 90개 실험 설정 · 0.1 / 100회'}))
  expect(screen.getByRole('spinbutton', {name: '반복 횟수'})).toHaveProperty('value', '100')
  expect(screen.getByRole('spinbutton', {name: '학습률'})).toHaveProperty('value', '0.1')
  fireEvent.click(screen.getByRole('button', {name: '학습하고 결과 비교'}))
  expect(train).toHaveBeenCalledWith(prompt, 100, 0.1)
  setBusy(true)
  expect(screen.getByRole('button', {name: '한국어 90개 실험 설정 · 0.1 / 100회'})).toHaveProperty(
    'disabled',
    true,
  )
})
