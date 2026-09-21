/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {PictureDiaryStroke} from '../features/picture-diary'
import {PictureDiaryDrawing} from '../components/memory-assist/picture-diary/Drawing'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should not clear page strokes when undo is pressed immediately after opening the editor', () => {
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([
      {points: [{x: 0.5, y: 0.5}]},
    ])
    return <PictureDiaryDrawing strokes={strokes()} onChange={setStrokes} />
  })

  const preview = screen.getByRole('button', {name: '그림 그리기'})
  expect(preview.querySelector('circle')).toBeInTheDocument()

  fireEvent.click(preview)
  fireEvent.click(screen.getByRole('button', {name: '한 획 취소'}))

  expect(preview.querySelector('circle')).toBeInTheDocument()
})
