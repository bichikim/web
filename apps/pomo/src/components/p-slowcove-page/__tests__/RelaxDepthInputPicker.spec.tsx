/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {RelaxDepthInputPicker} from '../RelaxDepthInputPicker'

afterEach(() => cleanup())

it('should explain and disable depth inputs while reduced motion is preferred', () => {
  const onChange = vi.fn()
  render(() => (
    <RelaxDepthInputPicker inputMode="drag" onChange={onChange} status="reduced-motion" />
  ))

  expect(screen.getByRole('status', {name: '기울기 센서 상태'})).toHaveTextContent(
    '동작 줄이기 설정을 따르는 동안 깊이 움직임을 사용할 수 없어요. 설정을 끄면 입력 방식을 다시 선택할 수 있어요.',
  )
  expect(screen.getByRole('radio', {name: '드래그'})).toBeDisabled()
  expect(screen.getByRole('radio', {name: '자이로'})).toBeDisabled()
})
