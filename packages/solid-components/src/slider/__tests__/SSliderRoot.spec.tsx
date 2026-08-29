/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it} from 'vitest'
import {SSliderBar} from '../SSliderBar'
import {SSliderHandle} from '../SSliderHandle'
import {SSliderRangeKnob} from '../SSliderRangeKnob'
import {SSliderRoot} from '../SSliderRoot'

describe('slider components', () => {
  it('should update horizontal slider semantics from bar clicks', async () => {
    expect(SSliderRangeKnob()).toBeUndefined()

    const view = render(() => (
      <SSliderRoot min={10} max={30}>
        <SSliderBar component="div" data-testid="bar">
          <SSliderHandle component="button">Handle</SSliderHandle>
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

    await fireEvent.click(bar, {offsetX: 100})

    expect(view.getByRole('slider').getAttribute('aria-orientation')).toBe('horizontal')
    expect(view.getByRole('slider').getAttribute('aria-valuemin')).toBe('10')
    expect(view.getByRole('slider').getAttribute('aria-valuemax')).toBe('30')
  })
})
