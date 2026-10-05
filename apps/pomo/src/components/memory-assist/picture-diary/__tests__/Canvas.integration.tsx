/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import type {PictureDiaryStroke} from '../../../../features/picture-diary'
import {PictureDiaryCanvas} from '../Canvas'

it('should cap a continuous stroke and report the limit without invalidating the drawing', () => {
  const onLimit = vi.fn()
  let latest: ReadonlyArray<PictureDiaryStroke> = []
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
    return (
      <PictureDiaryCanvas
        strokes={strokes()}
        onLimit={onLimit}
        onChange={(next) => {
          latest = next
          setStrokes(next)
        }}
      />
    )
  })
  const canvas = screen.getByLabelText('그림 그리는 곳')
  for (let index = 0; index < 2001; index += 1) {
    const event = new Event(index === 0 ? 'pointerdown' : 'pointermove', {bubbles: true})
    Object.defineProperties(event, {
      button: {value: 0},
      buttons: {value: 1},
      pointerId: {value: 1},
    })
    canvas.dispatchEvent(event)
  }
  expect(latest[0]?.points).toHaveLength(2000)
  expect(onLimit).toHaveBeenCalledOnce()
})
