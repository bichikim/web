/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import {SSliderBar} from '../SSliderBar'
import {SSliderHandle} from '../SSliderHandle'
import {SSliderRangeKnob} from '../SSliderRangeKnob'
import {SSliderRoot} from '../SSliderRoot'

describe('slider components', () => {
  it.each(['horizontal', 'vertical'] as const)(
    'should use the current %s bar size after layout changes',
    (type) => {
      const view = render(() => (
        <SSliderRoot type={type} min={10} max={30}>
          <SSliderBar component="div" data-testid="bar">
            <SSliderHandle component="button">Handle</SSliderHandle>
          </SSliderBar>
        </SSliderRoot>
      ))
      const bar = view.getByTestId('bar')
      const slider = view.getByRole('slider')
      const bounds = vi.spyOn(bar, 'getBoundingClientRect')
      const click = {clientX: 100, clientY: 100}

      // The initial DOM measurement is zero, as when the bar is detached or hidden.
      bounds.mockReturnValue(new DOMRect(0, 0, 200, 400))
      fireEvent.click(bar, click)
      expect(slider).toHaveAttribute('aria-valuenow', type === 'horizontal' ? '20' : '15')

      bounds.mockReturnValue(new DOMRect(0, 0, 400, 800))
      fireEvent.click(bar, click)
      expect(slider).toHaveAttribute('aria-valuenow', type === 'horizontal' ? '15' : '12.5')

      bounds.mockReturnValue(new DOMRect())
      fireEvent.click(bar, {clientX: 0, clientY: 0})
      expect(slider).toHaveAttribute('aria-valuenow', type === 'horizontal' ? '15' : '12.5')

      bounds.mockReturnValue(new DOMRect(0, 0, 200, 400))
      fireEvent.click(bar, click)
      expect(slider).toHaveAttribute('aria-valuenow', type === 'horizontal' ? '20' : '15')
    },
  )

  it('should update horizontal slider semantics from bar clicks', async () => {
    expect(SSliderRangeKnob()).toBeUndefined()

    const onPointerDown = vi.fn()
    const view = render(() => (
      <SSliderRoot min={10} max={30}>
        <SSliderBar component="div" data-testid="bar">
          <SSliderHandle component="button" onPointerDown={[onPointerDown, 'caller']}>
            Handle
          </SSliderHandle>
        </SSliderBar>
      </SSliderRoot>
    ))
    const bar = view.getByTestId('bar')
    bar.getBoundingClientRect = () => ({
      bottom: 20,
      height: 20,
      left: 0,
      right: 200,
      toJSON: () => ({}),
      top: 0,
      width: 200,
      x: 0,
      y: 0,
    })

    fireEvent.pointerDown(view.getByRole('slider'))
    expect(onPointerDown).toHaveBeenCalledWith('caller', expect.any(Event))
    fireEvent.mouseUp(globalThis.window)

    await fireEvent.click(bar, {offsetX: 100})

    expect(view.getByRole('slider').getAttribute('aria-orientation')).toBe('horizontal')
    expect(view.getByRole('slider').getAttribute('aria-valuemin')).toBe('10')
    expect(view.getByRole('slider').getAttribute('aria-valuemax')).toBe('30')
  })
})
