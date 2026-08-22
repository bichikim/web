/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {PGenerationStatus} from '../PGenerationStatus'

it('should show a concrete status without progress when no value is provided', () => {
  render(() => (
    <PGenerationStatus
      kind="voice"
      message="대사를 입력한 뒤 음성 만들기를 눌러 주세요."
      progressLabel="음성 모델 준비 진행률"
    />
  ))

  expect(screen.getByRole('status').textContent).toBe('대사를 입력한 뒤 음성 만들기를 눌러 주세요.')
  expect(screen.queryByRole('progressbar')).toBeNull()
})

it('should expose zero percent progress with the requested semantic label', () => {
  render(() => (
    <PGenerationStatus
      kind="draft"
      message="대사 초안을 작성하고 있어요."
      progress={0}
      progressLabel="대사 생성 진행률"
    />
  ))

  expect(screen.getByRole('status').textContent).toContain('0%')
  expect(
    screen.getByRole('progressbar', {name: '대사 생성 진행률'}).getAttribute('aria-valuenow'),
  ).toBe('0')
})
