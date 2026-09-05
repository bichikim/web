/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import type {PictureDiaryImage, PictureDiaryStroke} from '../../../../features/picture-diary'
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
  expect(dialog.querySelector('header')).toBeInTheDocument()
  expect(within(dialog).getByRole('button', {name: '닫기'})).toBeInTheDocument()
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

it('should remove the generated image without clearing the hand drawing', () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:drawing')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const strokes = [{points: [{x: 0.5, y: 0.5}]}]
  render(() => {
    const [image, setImage] = createSignal<PictureDiaryImage | undefined>({
      blob: new Blob(['png'], {type: 'image/png'}),
      prompt: 'A park',
    })
    return <PictureDiaryDrawing strokes={strokes} image={image()} onImageChange={setImage} />
  })
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  const dialog = screen.getByRole('dialog')
  expect(dialog.querySelector('image')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '생성 이미지 제거'}))
  expect(dialog.querySelector('image')).toBeNull()
  expect(dialog.querySelector('circle')).toBeInTheDocument()
})

it('should place the drawing modes in the modal header and associate their panels', async () => {
  render(() => <PictureDiaryDrawing strokes={[]} onImageChange={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  const dialog = screen.getByRole('dialog')
  const header = dialog.querySelector('header')!
  expect(header).toHaveAttribute('data-title-visibility', 'visually-hidden')
  const draw = within(header).getByRole('tab', {name: '직접 그리기'})
  const generate = within(header).getByRole('tab', {name: '이미지 생성'})
  expect(draw).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel', {name: '직접 그리기'})).toBeInTheDocument()
  fireEvent.click(generate)
  expect(generate).toHaveAttribute('aria-selected', 'true')
  expect(screen.getByRole('tabpanel', {name: '이미지 생성'})).toBeInTheDocument()
  expect(screen.queryByRole('tabpanel', {name: '직접 그리기'})).not.toBeInTheDocument()
  fireEvent.click(draw)
  expect(screen.getByRole('tabpanel', {name: '직접 그리기'})).toBeInTheDocument()
  fireEvent.click(within(header).getByRole('button', {name: '닫기'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})
