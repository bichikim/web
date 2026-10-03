/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it} from 'vitest'
import type {PictureDiaryStroke} from 'src/features/picture-diary'
import {useDrawingHistory} from '../use-history'

afterEach(cleanup)

it('should restore the exact styled strokes after clearing and clear them again on redo', () => {
  const initial: ReadonlyArray<PictureDiaryStroke> = [
    {color: 'blue', points: [{x: 0.5, y: 0.5}], thickness: 'thick'},
  ]
  const {result} = renderHook(() => {
    const [strokes, setStrokes] = createSignal(initial)
    const history = useDrawingHistory({
      onChange: setStrokes,
      get strokes() {
        return strokes()
      },
    })
    return {history, strokes}
  })

  result.history.clear()
  expect(result.strokes()).toEqual([])
  result.history.undo()
  expect(result.strokes()).toBe(initial)
  result.history.redo()
  expect(result.strokes()).toEqual([])
})

it('should retain the drawing limit of 200 captures', () => {
  const {result} = renderHook(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
    const history = useDrawingHistory({
      onChange: setStrokes,
      get strokes() {
        return strokes()
      },
    })
    return {history, setStrokes, strokes}
  })
  for (let index = 0; index < 201; index += 1) {
    result.history.begin()
    result.setStrokes([{points: [{x: index / 201, y: 0.5}]}])
  }
  for (let index = 0; index < 200; index += 1) {
    result.history.undo()
  }
  expect(result.strokes()).toEqual([{points: [{x: 0, y: 0.5}]}])
  expect(result.history.canUndo()).toBe(false)
})

it('should preserve optional change callbacks for read-only callers', () => {
  const {result} = renderHook(() => useDrawingHistory({strokes: []}))
  result.clear()
  result.undo()
  result.redo()
  result.reset()
  expect(result.canUndo()).toBe(false)
  expect(result.canRedo()).toBe(false)
})
