import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {setLocale} from '@paraglide/runtime'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {writePomodoroTimerState} from 'src/features/pomodoro-timer'
import {PPomodoro} from '../PPomodoro'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

it('should reflect the dialog state and name an idle long break in quick controls', async () => {
  setLocale('ko', {reload: false})
  render(() =>
    createComponent(PreferenceProvider, {
      get children() {
        return createComponent(PPomodoro, {})
      },
    }),
  )
  const trigger = page.getByRole('button', {name: /^포모도로 열기,/u})
  const triggerElement = trigger.element()
  await expect.element(triggerElement).toHaveAttribute('aria-expanded', 'false')
  await trigger.click()
  const dialog = page.getByRole('dialog', {exact: true, name: '포모도로'})
  await expect.element(dialog).toBeVisible()
  await expect.element(triggerElement).toHaveAttribute('aria-expanded', 'true')
  await expect.element(triggerElement).toHaveAttribute('data-expanded', '')

  await dialog.getByRole('button', {name: /세션 · 집중/u}).click()
  await dialog.getByRole('spinbutton', {name: '집중 횟수(회)'}).fill('1')
  await dialog.getByRole('button', {name: '설정 저장'}).click()
  await dialog.getByRole('button', {name: '다음 단계로 이동'}).click()
  await userEvent.keyboard('{Escape}')

  await expect.element(dialog).not.toBeInTheDocument()
  await expect.element(triggerElement).toHaveAttribute('aria-expanded', 'false')
  await expect.element(triggerElement).not.toHaveAttribute('data-expanded')
  await expect.element(triggerElement).toHaveAccessibleName(/^포모도로 열기, 긴 휴식 준비,/u)
})

const renderTimer = () =>
  render(() =>
    createComponent(PreferenceProvider, {
      get children() {
        return createComponent(PPomodoro, {})
      },
    }),
  )
const openTimer = () => page.getByRole('button', {name: /^포모도로 열기,/u}).click()

it('should preserve completed sessions when the cycle increases during a long break', async () => {
  await setLocale('ko', {reload: false})
  writePomodoroTimerState({
    completedFocusSessions: 8,
    phase: 'longBreak',
    remainingSeconds: 900,
    status: 'idle',
  })

  renderTimer()
  await openTimer()
  const dialog = page.getByRole('dialog', {exact: true, name: '포모도로'})
  await expect.element(dialog.getByLabelText('4회 중 4회 집중 완료')).toBeInTheDocument()
  await dialog.getByRole('button', {name: /4세션 · 집중/u}).click()
  await dialog.getByRole('spinbutton', {name: '집중 횟수(회)'}).fill('6')
  await dialog.getByRole('button', {name: '설정 저장'}).click()
  await expect.element(dialog.getByLabelText('6회 중 4회 집중 완료')).toBeInTheDocument()

  cleanup()
  renderTimer()
  await openTimer()
  await expect.element(dialog.getByLabelText('6회 중 4회 집중 완료')).toBeInTheDocument()
})
