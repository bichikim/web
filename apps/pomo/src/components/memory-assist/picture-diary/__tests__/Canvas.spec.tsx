/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
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

it('should not emit a drawing that exceeds the storage stroke limit', () => {
  const onChange = vi.fn()
  const strokes = Array.from({length: 200}, () => ({points: [{x: 0.5, y: 0.5}]}))
  render(() => <PictureDiaryCanvas strokes={strokes} onChange={onChange} />)
  const event = new Event('pointerdown', {bubbles: true})
  Object.defineProperties(event, {button: {value: 0}, pointerId: {value: 1}})
  screen.getByLabelText('그림 그리는 곳').dispatchEvent(event)
  expect(onChange).not.toHaveBeenCalled()
})

it('should append normalized pointer strokes to the drawing', () => {
  const TestCanvas = () => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
    return <PictureDiaryCanvas onChange={setStrokes} strokes={strokes()} />
  }
  const view = render(() => <TestCanvas />)
  const canvas = screen.getByLabelText('그림 그리는 곳')
  expect(canvas).toHaveClass('picture-diary-book__canvas')
  expect(canvas).not.toHaveClass('ring-1')
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({height: 100, left: 10, top: 20, width: 200}),
  })
  const dispatchPointer = (
    type: string,
    values: {
      readonly button?: number
      readonly buttons?: number
      readonly clientX?: number
      readonly clientY?: number
      readonly pointerId: number
    },
  ) => {
    const event = new Event(type, {bubbles: true})
    Object.defineProperties(event, {
      button: {value: values.button ?? 0},
      buttons: {value: values.buttons ?? 0},
      clientX: {value: values.clientX ?? 0},
      clientY: {value: values.clientY ?? 0},
      pointerId: {value: values.pointerId},
    })
    canvas.dispatchEvent(event)
  }

  dispatchPointer('pointerdown', {button: 0, clientX: 60, clientY: 70, pointerId: 1})
  dispatchPointer('pointermove', {buttons: 1, clientX: 110, clientY: 45, pointerId: 1})
  dispatchPointer('pointerup', {pointerId: 1})

  expect(view.container.querySelector('polyline')).toHaveAttribute('points', '250,281 500,140.5')
})

it('should expose a labelled read-only drawing without changing it', () => {
  const onChange = vi.fn()
  render(() => (
    <PictureDiaryCanvas
      accessibleLabel="이전 일기의 그림"
      onChange={onChange}
      readOnly={true}
      strokes={[]}
    />
  ))
  const canvas = screen.getByLabelText('이전 일기의 그림')
  const event = new Event('pointerdown', {bubbles: true})
  Object.defineProperties(event, {
    button: {value: 0},
    pointerId: {value: 1},
  })

  canvas.dispatchEvent(event)

  expect(canvas).toHaveAttribute('data-read-only')
  expect(onChange).not.toHaveBeenCalled()
})
