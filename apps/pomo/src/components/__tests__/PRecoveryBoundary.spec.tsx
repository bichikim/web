/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {SometimesBroken} from './support/SometimesBroken'
import {TestRecovery} from './support/TestRecovery'
import {ThrowError} from './support/ThrowError'

it('should hide internal details and expose an error ID with recovery actions', () => {
  const reload = vi.fn()
  const reportError = vi.fn(() => 'POMO-SAFE-ID')
  const internalError = new Error('Bearer private-token internal stack')

  render(() => (
    <TestRecovery onReload={reload} reportError={reportError}>
      <ThrowError error={internalError} />
    </TestRecovery>
  ))

  expect(screen.getByRole('heading', {name: 'Pomofi를 불러오지 못했어요'})).toBeTruthy()
  expect(screen.getByText(/POMO-SAFE-ID/u)).toBeTruthy()
  expect(screen.queryByText(/private-token/u)).toBeNull()
  expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy()
  const homeLink = screen.getByRole('link', {name: '홈으로 이동'})
  expect(homeLink.getAttribute('href')).toBe('/')
  expect(homeLink.getAttribute('target')).toBe('_self')
  fireEvent.click(screen.getByRole('button', {name: '새로고침'}))
  expect(reload).toHaveBeenCalledTimes(1)
})

it('should stop offering reset after the recovered subtree fails again', () => {
  const reportError = vi.fn(() => 'POMO-LOOP-ID')
  const repeatError = new Error('repeat failure')

  render(() => (
    <TestRecovery onReload={vi.fn()} reportError={reportError}>
      <ThrowError error={repeatError} />
    </TestRecovery>
  ))

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
  expect(screen.getByText(/자동 복구를 중단했어요/u)).toBeTruthy()
  expect(screen.getByRole('button', {name: '새로고침'})).toBeTruthy()
  expect(reportError).toHaveBeenCalledTimes(2)
})

it('should restore one retry after the recovered subtree mounts successfully', () => {
  const [failure, setFailure] = createSignal<'initial' | 'later' | null>('initial')
  let initialFailureHandled = false
  const shouldFailInitially = () => {
    if (failure() !== 'initial' || initialFailureHandled) {
      return false
    }

    initialFailureHandled = true
    return true
  }

  render(() => (
    <TestRecovery onReload={vi.fn()} reportError={() => 'POMO-RECOVERED'}>
      <SometimesBroken
        failure={failure}
        onLaterFailure={() => setFailure('later')}
        shouldFailInitially={shouldFailInitially}
      />
    </TestRecovery>
  ))

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  fireEvent.click(screen.getByRole('button', {name: '나중에 실패'}))

  expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy()
})
