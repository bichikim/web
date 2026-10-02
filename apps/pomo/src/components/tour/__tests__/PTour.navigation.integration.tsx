/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {PTour, type PTourStep} from '../PTour'

const STEPS = [
  {
    description: '타이머 사용법을 확인해요.',
    id: 'timer',
    title: '집중 타이머',
    video: {label: '타이머 사용 영상', source: '/tour/timer.webm'},
  },
  {description: '집중할 음악을 골라요.', id: 'music', title: '음악 플레이어'},
] as const satisfies ReadonlyArray<PTourStep>

test('should revisit the final target and complete the tour', async () => {
  const timerElement = document.createElement('button')
  const musicElement = document.createElement('button')
  timerElement.getBoundingClientRect = () => new DOMRect(40, 60, 120, 48)
  musicElement.getBoundingClientRect = () => new DOMRect(240, 180, 160, 64)
  const elements = new Map<string, Element>([
    ['timer', timerElement],
    ['music', musicElement],
  ])
  const onEvent = vi.fn()
  const onOpenChange = vi.fn()

  const Harness = () => {
    const [isOpen, setIsOpen] = createSignal(true)
    return (
      <PTour
        getStepElement={(stepId) => elements.get(stepId) ?? null}
        isOpen={isOpen()}
        onEvent={onEvent}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen)
          onOpenChange(nextOpen)
        }}
        steps={STEPS}
      />
    )
  }

  render(() => <Harness />)
  expect(await screen.findByRole('dialog', {name: '집중 타이머'})).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  await waitFor(() =>
    expect(screen.getByRole('dialog', {name: '음악 플레이어'})).toBeInTheDocument(),
  )
  expect(screen.getByText('2 / 2')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '이전'}))
  await waitFor(() => expect(screen.getByRole('dialog', {name: '집중 타이머'})).toBeInTheDocument())
  expect(screen.getByText('1 / 2')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  await waitFor(() =>
    expect(screen.getByRole('dialog', {name: '음악 플레이어'})).toBeInTheDocument(),
  )
  expect(screen.getByText('2 / 2')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '완료'}))

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(onOpenChange).toHaveBeenLastCalledWith(false)
  expect(onEvent).toHaveBeenLastCalledWith({
    activeElement: musicElement,
    step: STEPS[1],
    type: 'completed',
  })
})
