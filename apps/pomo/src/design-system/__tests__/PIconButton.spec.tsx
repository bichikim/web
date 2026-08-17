/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PIconButton} from '../PIconButton'

it('should expose the medium icon button class contract', () => {
  const result = render(() => (
    <PIconButton
      accessibleLabel="시간대 낮"
      feedback="낮"
      icon="i-tabler-sun"
      onPress={() => undefined}
    />
  ))

  const button = result.getByRole('button', {name: '시간대 낮'})

  expect(button.classList.contains('pomo-icon-button')).toBe(true)
  expect(button.classList.contains('h-control-md')).toBe(true)
  expect(button.classList.contains('min-w-control-md')).toBe(true)
  expect(button.classList.contains('[padding-inline:0.6875rem]')).toBe(true)
})

it('should expose the small icon button class contract', () => {
  const result = render(() => (
    <PIconButton
      accessibleLabel="다음 단계로 이동"
      feedback="다음 단계"
      icon="i-tabler-player-track-next"
      onPress={() => undefined}
      size="small"
    />
  ))

  const button = result.getByRole('button', {name: '다음 단계로 이동'})

  expect(button.classList.contains('pomo-icon-button')).toBe(true)
  expect(button.classList.contains('h-control-sm')).toBe(true)
  expect(button.classList.contains('min-w-control-sm')).toBe(true)
  expect(button.classList.contains('[padding-inline:0.4375rem]')).toBe(true)
})
