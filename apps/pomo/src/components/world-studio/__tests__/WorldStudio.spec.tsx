/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {WorldStudio} from '../WorldStudio'

vi.mock('../WorldViewportCanvas', () => ({
  WorldViewportCanvas: () => <canvas aria-label="3D 캐릭터 조명 테스트 장면" />,
}))

afterEach(() => {
  cleanup()
})

it('should describe the active lookdev rendering setup beside the viewport', () => {
  render(() => <WorldStudio />)

  expect(screen.getByRole('heading', {name: 'Hinata character'})).toBeInTheDocument()
  expect(screen.getByText('EXR 환경광')).toBeInTheDocument()
  expect(screen.getByText('Hinata GLB')).toBeInTheDocument()
  expect(screen.getByText('SSAO2 · 비네팅 · 디더링')).toBeInTheDocument()
  expect(screen.getByLabelText('3D 캐릭터 조명 테스트 장면')).toBeInTheDocument()
})
