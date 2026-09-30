/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PModelDownloadProvider} from '../../../../features/model-download'
import type {PictureDiaryImage, PictureDiaryStroke} from '../../../../features/picture-diary'
import {PictureDiaryDrawing} from '../Drawing'

vi.mock('../Generation', () => ({
  Generation: (props: {
    readonly onApply?: (image: PictureDiaryImage) => void
    readonly onPreviewChange?: (image: PictureDiaryImage | undefined) => void
  }) => {
    const image = {blob: new Blob(['png'], {type: 'image/png'}), prompt: 'Generated park'}
    return (
      <>
        <textarea aria-label="생성 설명" />
        <button type="button" onClick={() => props.onPreviewChange?.(image)}>
          생성 미리보기 준비
        </button>
        <button type="button" onClick={() => props.onApply?.(image)}>
          생성 이미지 적용
        </button>
      </>
    )
  },
}))

const getComputedStyle = globalThis.getComputedStyle.bind(globalThis)

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect = vi.fn()
      observe = vi.fn()
    },
  )
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const styles = getComputedStyle(element, pseudoElement)
    Object.defineProperty(styles, 'animationName', {configurable: true, value: 'none'})
    return styles
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
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
  expect(screen.getByRole('button', {name: '한 획 취소'})).toBeDisabled()
  expect(preview.querySelectorAll('circle')).toHaveLength(1)
})
