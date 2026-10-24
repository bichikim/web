/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {CameraControls} from '../CameraControls'

describe('CameraControls', () => {
  it('should emit camera actions for every button', () => {
    const onAction = vi.fn()
    render(() => <CameraControls onAction={onAction} />)
    for (const button of screen.getAllByRole('button')) {
      fireEvent.click(button)
    }
    expect(onAction.mock.calls.map(([action]) => action)).toEqual([
      'up',
      'down',
      'left',
      'right',
      'zoom-in',
      'zoom-out',
      'rotate-left',
      'rotate-right',
      'reset',
    ])
  })
  it('should disable the controls while the model is unavailable', () => {
    render(() => <CameraControls disabled onAction={vi.fn()} />)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled()
    }
  })
})
