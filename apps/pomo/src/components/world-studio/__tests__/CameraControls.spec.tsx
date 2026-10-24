/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {CameraControls} from '../CameraControls'

afterEach(() => {
  cleanup()
})

it('should expose zoom and directional controls for the camera', () => {
  const onMoveDown = vi.fn()
  const onMoveLeft = vi.fn()
  const onMoveRight = vi.fn()
  const onMoveUp = vi.fn()
  const onZoomIn = vi.fn()
  const onZoomOut = vi.fn()

  render(() => (
    <CameraControls
      onMoveDown={onMoveDown}
      onMoveLeft={onMoveLeft}
      onMoveRight={onMoveRight}
      onMoveUp={onMoveUp}
      onZoomIn={onZoomIn}
      onZoomOut={onZoomOut}
    />
  ))

  screen.getByRole('button', {name: '축소'}).click()
  screen.getByRole('button', {name: '확대'}).click()
  screen.getByRole('button', {name: '위로 이동'}).click()
  screen.getByRole('button', {name: '왼쪽으로 이동'}).click()
  screen.getByRole('button', {name: '오른쪽으로 이동'}).click()
  screen.getByRole('button', {name: '아래로 이동'}).click()

  expect(onZoomOut).toHaveBeenCalledOnce()
  expect(onZoomIn).toHaveBeenCalledOnce()
  expect(onMoveUp).toHaveBeenCalledOnce()
  expect(onMoveLeft).toHaveBeenCalledOnce()
  expect(onMoveRight).toHaveBeenCalledOnce()
  expect(onMoveDown).toHaveBeenCalledOnce()
})
