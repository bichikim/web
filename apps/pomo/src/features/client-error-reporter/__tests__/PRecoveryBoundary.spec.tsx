/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {PRecoveryBoundary} from 'src/features/client-error-reporter'

it('should hide internal details and expose an error ID with recovery actions', () => {
  const reload = vi.fn()
  const reportError = vi.fn(() => 'POMO-SAFE-ID')
  const internalError = new Error('Bearer private-token internal stack')
  const Broken = () => {
    throw internalError
  }

  render(() => (
    <PRecoveryBoundary onReload={reload} reportError={reportError}>
      <Broken />
    </PRecoveryBoundary>
  ))

  expect(screen.getByRole('heading', {name: 'Pomofi를 불러오지 못했어요'})).toBeTruthy()
  expect(screen.getByText(/POMO-SAFE-ID/u)).toBeTruthy()
  expect(screen.queryByText(/private-token/u)).toBeNull()
  expect(screen.getByRole('button', {name: '다시 시도'})).toBeTruthy()
  fireEvent.click(screen.getByRole('button', {name: '새로고침'}))
  expect(reload).toHaveBeenCalledTimes(1)
})

it('should stop offering reset after the recovered subtree fails again', () => {
  const reportError = vi.fn(() => 'POMO-LOOP-ID')
  const Broken = () => {
    throw new Error('repeat failure')
  }

  render(() => (
    <PRecoveryBoundary onReload={vi.fn()} reportError={reportError}>
      <Broken />
    </PRecoveryBoundary>
  ))

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
  expect(screen.getByText(/자동 복구를 중단했어요/u)).toBeTruthy()
  expect(screen.getByRole('button', {name: '새로고침'})).toBeTruthy()
  expect(reportError).toHaveBeenCalledTimes(2)
})
