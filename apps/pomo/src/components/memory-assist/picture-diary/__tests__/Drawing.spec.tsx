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
  render(() => (
    <PModelDownloadProvider>
      <PictureDiaryDrawing strokes={[]} onImageChange={vi.fn()} />
    </PModelDownloadProvider>
  ))
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
  const generationPanel = screen.getByRole('tabpanel', {name: '이미지 생성'})
  await waitFor(() => expect(within(generationPanel).getByRole('textbox')).toBeInTheDocument())
  expect(screen.queryByRole('tabpanel', {name: '직접 그리기'})).not.toBeInTheDocument()
  fireEvent.click(draw)
  expect(screen.getByRole('tabpanel', {name: '직접 그리기'})).toBeInTheDocument()
  fireEvent.click(within(header).getByRole('button', {name: '닫기'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('should apply a generated preview when completing from the drawing tab', async () => {
  const onImageChange = vi.fn()
  render(() => (
    <PModelDownloadProvider>
      <PictureDiaryDrawing strokes={[]} onImageChange={onImageChange} />
    </PModelDownloadProvider>
  ))
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  const dialog = screen.getByRole('dialog')
  const header = dialog.querySelector('header')!
  fireEvent.click(within(header).getByRole('tab', {name: '이미지 생성'}))
  fireEvent.click(await within(dialog).findByRole('button', {name: '생성 미리보기 준비'}))
  expect(onImageChange).not.toHaveBeenCalled()
  fireEvent.click(within(header).getByRole('tab', {name: '직접 그리기'}))
  fireEvent.click(within(dialog).getByRole('button', {name: '완료'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(onImageChange).toHaveBeenCalledWith(expect.objectContaining({prompt: 'Generated park'}))
})

it('should not apply a generated image twice after choosing to draw on it', async () => {
  const onImageChange = vi.fn()
  render(() => (
    <PModelDownloadProvider>
      <PictureDiaryDrawing strokes={[]} onImageChange={onImageChange} />
    </PModelDownloadProvider>
  ))
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  const dialog = screen.getByRole('dialog')
  const header = dialog.querySelector('header')!
  fireEvent.click(within(header).getByRole('tab', {name: '이미지 생성'}))
  fireEvent.click(await within(dialog).findByRole('button', {name: '생성 미리보기 준비'}))
  fireEvent.click(within(dialog).getByRole('button', {name: '생성 이미지 적용'}))
  expect(onImageChange).toHaveBeenCalledTimes(1)
  fireEvent.click(within(dialog).getByRole('button', {name: '완료'}))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(onImageChange).toHaveBeenCalledTimes(1)
})

it('should undo and redo clearing without losing stroke styles', () => {
  render(() => {
    const [strokes, setStrokes] = createSignal<ReadonlyArray<PictureDiaryStroke>>([
      {color: 'blue', points: [{x: 0.5, y: 0.5}], thickness: 'thick'},
    ])
    return <PictureDiaryDrawing strokes={strokes()} onChange={setStrokes} />
  })
  fireEvent.click(screen.getByRole('button', {name: '그림 그리기'}))
  fireEvent.click(screen.getByRole('button', {name: '그림 지우기'}))
  fireEvent.click(screen.getByRole('button', {name: '한 획 취소'}))
  expect(screen.getByRole('dialog').querySelector('circle')).toHaveClass('[r:8]')
  fireEvent.click(screen.getByRole('button', {name: '다시 실행'}))
  expect(screen.getByRole('dialog').querySelector('circle')).toBeNull()
  const color = screen.getByRole('button', {name: '펜 색상 기본색'})
  const footer = screen.getByRole('button', {name: '완료'}).parentElement!
  expect(footer).toContainElement(color)
  expect(footer).toContainElement(screen.getByRole('button', {name: '펜'}))
  expect(footer).toContainElement(screen.getByRole('button', {name: '굵게'}))
  expect(screen.queryByRole('button', {name: '파랑'})).not.toBeInTheDocument()
})
