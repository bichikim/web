/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {PictureDiaryStroke} from '../../../../features/picture-diary'
import {PictureDiaryDrawing} from '../Drawing'

const getComputedStyle = window.getComputedStyle.bind(window)

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const styles = getComputedStyle(element, pseudoElement)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should edit in a popup, retain the drawing ratio, and update the page preview', async () => {
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([])
    return <PictureDiaryDrawing strokes={strokes()} onChange={setStrokes} />
  })
  const trigger = screen.getByRole('button', {name: '그림 그리기'})
  const preview = trigger.querySelector('svg')!
  expect(preview).toHaveAttribute('data-read-only')
  expect(screen.queryByRole('button', {name: '한 획 취소'})).not.toBeInTheDocument()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', {name: '그림 그리기'})
  expect(dialog.querySelector('header')).toBeNull()
  expect(within(dialog).queryByRole('button', {name: '닫기'})).not.toBeInTheDocument()
  const canvas = within(dialog).getByRole('img', {name: '그림 그리는 곳'})
  expect(canvas.getAttribute('viewBox')).toBe(preview.getAttribute('viewBox'))
  const event = new Event('pointerdown', {bubbles: true})
  Object.defineProperties(event, {
    button: {value: 0},
    clientX: {value: 0},
    clientY: {value: 0},
    pointerId: {value: 1},
  })
  canvas.dispatchEvent(event)
  expect(canvas.querySelectorAll('circle')).toHaveLength(1)
  fireEvent.click(within(dialog).getByRole('button', {name: '완료'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(preview.querySelectorAll('circle')).toHaveLength(1)
  await waitFor(() => expect(trigger).toHaveFocus())
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('button', {name: '한 획 취소'}))
  expect(preview.querySelectorAll('circle')).toHaveLength(0)
  expect(screen.getByRole('button', {name: '그림 지우기'})).toBeDisabled()
})

it('should clear existing drawing only from the popup', () => {
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([
      {points: [{x: 0.5, y: 0.5}]},
    ])
    return <PictureDiaryDrawing strokes={strokes()} onChange={setStrokes} />
  })
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  fireEvent.click(screen.getByRole('button', {name: '그림 지우기'}))
  expect(screen.getByRole('dialog').querySelector('circle')).toBeNull()
})
