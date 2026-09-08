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

it('should display the generated image behind strokes and release preview URLs', () => {
  const createUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:canvas')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'A park'}
  const view = render(() => (
    <PictureDiaryCanvas image={image} strokes={[{points: [{x: 0.5, y: 0.5}]}]} />
  ))
  const canvas = view.container.querySelector('svg')!
  expect(canvas.firstElementChild?.tagName).toBe('image')
  expect(canvas.querySelector('image')).toHaveAttribute('href', 'blob:canvas')
  expect(canvas.querySelector('circle')).toBeInTheDocument()
  view.unmount()
  expect(revokeUrl).toHaveBeenCalledWith('blob:canvas')
  createUrl.mockRestore()
  revokeUrl.mockRestore()
})

it('should keep the selected color and thickness while extending a stroke', () => {
  let latest: ReadonlyArray<PictureDiaryStroke> = []
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
    return (
      <PictureDiaryCanvas
        color="blue"
        thickness="thick"
        strokes={strokes()}
        onChange={(next) => {
          latest = next
          setStrokes(next)
        }}
      />
    )
  })
  const canvas = screen.getByLabelText('그림 그리는 곳')
  for (const type of ['pointerdown', 'pointermove']) {
    const event = new Event(type, {bubbles: true})
    Object.defineProperties(event, {
      button: {value: 0},
      buttons: {value: 1},
      clientX: {value: 0},
      clientY: {value: 0},
      pointerId: {value: 1},
    })
    canvas.dispatchEvent(event)
  }
  expect(latest[0]).toMatchObject({color: 'blue', thickness: 'thick'})
  expect(latest[0]?.points).toHaveLength(2)
})

it('should erase only the selected stroke and leave the background image alone', () => {
  const onChange = vi.fn()
  const strokes = [{points: [{x: 0.5, y: 0.5}]}, {points: [{x: 0.2, y: 0.2}]}]
  render(() => <PictureDiaryCanvas tool="eraser" strokes={strokes} onChange={onChange} />)
  const event = new Event('pointerdown', {bubbles: true})
  Object.defineProperties(event, {button: {value: 0}, pointerId: {value: 1}})
  screen.getByLabelText('그림 그리는 곳').querySelector('circle')!.dispatchEvent(event)
  expect(onChange).toHaveBeenCalledWith([strokes[1]])
})

it('should erase crossed strokes during one drag and record one undo step', () => {
  const onStart = vi.fn()
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([
      {points: [{x: 0.2, y: 0.5}]},
      {points: [{x: 0.5, y: 0.5}]},
    ])
    return (
      <PictureDiaryCanvas
        tool="eraser"
        strokes={strokes()}
        onChange={setStrokes}
        onStart={onStart}
      />
    )
  })
  const canvas = screen.getByLabelText('그림 그리는 곳')
  const circles = Array.from(canvas.querySelectorAll('circle'))
  const hitTest = vi.fn((x: number) =>
    x === 20 ? [circles[0]!] : x === 50 ? [circles[1]!] : [canvas],
  )
  Object.defineProperty(document, 'elementsFromPoint', {configurable: true, value: hitTest})
  const pointer = (type: string, x: number, pointerId = 1) => {
    const event = new Event(type, {bubbles: true})
    Object.defineProperties(event, {
      button: {value: 0},
      buttons: {value: 1},
      clientX: {value: x},
      clientY: {value: 10},
      pointerId: {value: pointerId},
    })
    canvas.dispatchEvent(event)
  }
  pointer('pointerdown', 0)
  pointer('pointermove', 60, 2)
  expect(canvas.querySelectorAll('circle')).toHaveLength(2)
  pointer('pointermove', 30)
  expect(canvas.querySelectorAll('circle')).toHaveLength(1)
  pointer('pointermove', 60)
  expect(canvas.querySelectorAll('circle')).toHaveLength(0)
  expect(onStart).toHaveBeenCalledOnce()
  pointer('pointerup', 60)
  hitTest.mockClear()
  pointer('pointermove', 80)
  expect(hitTest).not.toHaveBeenCalled()
  Reflect.deleteProperty(document, 'elementsFromPoint')
})

it('should cancel an active stroke when the drawing history changes', () => {
  const initialStroke = {
    points: [
      {x: 0.1, y: 0.1},
      {x: 0.2, y: 0.2},
    ],
  }
  let latest: ReadonlyArray<PictureDiaryStroke> = [initialStroke]
  const TestCanvas = () => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([initialStroke])
    const [gestureRevision, setGestureRevision] = createSignal(0)
    return (
      <>
        <button
          type="button"
          onClick={() => {
            latest = [initialStroke]
            setStrokes([initialStroke])
            setGestureRevision((revision) => revision + 1)
          }}
        >
          undo
        </button>
        <PictureDiaryCanvas
          gestureRevision={gestureRevision()}
          strokes={strokes()}
          onChange={(next) => {
            latest = next
            setStrokes(next)
          }}
        />
      </>
    )
  }
  render(() => <TestCanvas />)
  const canvas = screen.getByLabelText('그림 그리는 곳')
  Object.defineProperty(canvas, 'getBoundingClientRect', {
    value: () => ({height: 100, left: 0, top: 0, width: 100}),
  })
  const dispatchPointer = (
    type: string,
    values: {readonly buttons?: number; readonly pointerId: number},
  ) => {
    const event = new Event(type, {bubbles: true})
    Object.defineProperties(event, {
      button: {value: 0},
      buttons: {value: values.buttons ?? 0},
      clientX: {value: 50},
      clientY: {value: 50},
      pointerId: {value: values.pointerId},
    })
    canvas.dispatchEvent(event)
  }

  dispatchPointer('pointerdown', {pointerId: 1})
  expect(latest).toHaveLength(2)
  fireEvent.click(screen.getByRole('button', {name: 'undo'}))
  dispatchPointer('pointermove', {buttons: 1, pointerId: 1})

  expect(latest).toEqual([initialStroke])
})
