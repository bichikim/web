/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PictureDiaryEntry} from '../../../../features/picture-diary'
import type {BookPage} from '../pagination'
import {PictureDiaryEditor} from '../Editor'

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number
  readonly pointerType: string

  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 0
    this.pointerType = init.pointerType ?? 'mouse'
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('PointerEvent', TestPointerEvent)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => callback(performance.now()), 16),
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

interface RenderEditorOptions {
  readonly backCoverClosed?: boolean
  readonly canCloseBackCover?: boolean
  readonly canGoNewer?: boolean
  readonly canGoOlder?: boolean
  readonly currentEntry?: PictureDiaryEntry | null
  readonly newerEntry?: PictureDiaryEntry | null
  readonly olderEntry?: PictureDiaryEntry | null
  readonly onCloseBackCover?: () => void
  readonly onDeleteEntry?: (id: string) => void
  readonly onGoNewer?: () => void
  readonly onGoOlder?: () => void
  readonly onOpenBackCover?: () => void
  readonly previousEntry?: PictureDiaryEntry | null
}

const entryPage = (entry?: PictureDiaryEntry | null): BookPage =>
  entry === null || entry === undefined ? {kind: 'cover'} : {entry, kind: 'entry'}
const writingPage = (entry?: PictureDiaryEntry | null): BookPage =>
  entry === null || entry === undefined ? {kind: 'writing'} : {entry, kind: 'entry'}

const renderEditor = (options: RenderEditorOptions = {}) =>
  render(() => (
    <PictureDiaryEditor
      backCoverClosed={options.backCoverClosed}
      canCloseBackCover={options.canCloseBackCover}
      canGoNewer={options.canGoNewer}
      canGoOlder={options.canGoOlder}
      canSave={false}
      spread={{left: entryPage(options.previousEntry), right: writingPage(options.currentEntry)}}
      date="2026-09-04"
      newerSpread={{left: entryPage(options.currentEntry), right: writingPage(options.newerEntry)}}
      olderSpread={
        options.previousEntry
          ? {left: entryPage(options.olderEntry), right: entryPage(options.previousEntry)}
          : null
      }
      onCloseBackCover={options.onCloseBackCover}
      onDateChange={vi.fn()}
      onDeleteEntry={options.onDeleteEntry}
      onGoNewer={options.onGoNewer}
      onGoOlder={options.onGoOlder}
      onOpenBackCover={options.onOpenBackCover}
      onSave={vi.fn()}
      onStrokesChange={vi.fn()}
      onTextChange={vi.fn()}
      strokes={[]}
      text=""
    />
  ))

const installTurnBounds = (book: HTMLElement) => {
  const surface = book.querySelector('.picture-diary-book__edge-turns')!
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
    bottom: 500,
    height: 500,
    left: 0,
    right: 800,
    toJSON: () => ({}),
    top: 0,
    width: 800,
    x: 0,
    y: 0,
  })
}

const finishPageTurn = () => vi.advanceTimersByTime(700)

const sampleEntry = (text: string): PictureDiaryEntry => ({
  createdAt: '2026-09-04T03:00:00.000Z',
  date: '2026-09-04',
  id: text,
  strokes: [],
  text,
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
})

it('should show the receiving visible page on the reverse of a compact newer turn', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({matches: query === '(width < 48rem)'}))
  renderEditor({
    canGoNewer: true,
    currentEntry: sampleEntry('현재'),
    newerEntry: sampleEntry('다음'),
  })
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(book.querySelector('[data-picture-diary-turn-face="back"]')).toHaveTextContent('다음')
})

it('should keep the receiving cover underneath the moving page until the turn settles', () => {
  renderEditor({
    canGoNewer: true,
    currentEntry: sampleEntry('oldest'),
    newerEntry: sampleEntry('newer'),
  })
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  const spread = book.querySelector('.picture-diary-book__spread')!
  expect(spread.querySelector('.picture-diary-book__back-cover--inside')).toBeInTheDocument()
  expect(spread.querySelector('[data-picture-diary-page="previous"]')).toBeNull()
  expect(spread).toHaveTextContent('newer')
  expect(book.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent('oldest')
  vi.advanceTimersByTime(300)
  expect(spread.querySelector('.picture-diary-book__back-cover--inside')).toBeInTheDocument()
})

it('should keep the right page unchanged underneath an older turn', () => {
  renderEditor({
    canGoOlder: true,
    currentEntry: sampleEntry('current'),
    olderEntry: sampleEntry('older'),
    previousEntry: sampleEntry('previous'),
  })
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  const spread = book.querySelector('.picture-diary-book__spread')!
  expect(spread.querySelector('[data-picture-diary-page="current"]')).toHaveTextContent('current')
  expect(spread.querySelector('[data-picture-diary-page="previous"]')).toHaveTextContent('older')
})

it('should animate a short fold back without changing the page', () => {
  const onGoOlder = vi.fn()
  renderEditor({canGoOlder: true, onGoOlder, previousEntry: sampleEntry('previous')})
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.pointerDown(book.querySelector('[data-picture-diary-edge="older"]')!, {
    button: 0,
    clientX: 0,
    clientY: 200,
    pointerId: 1,
  })
  const pager = book.parentElement!.querySelector('.picture-diary-book__pager')!
  expect(pager).not.toBeVisible()
  fireEvent.pointerMove(window, {clientX: 20, clientY: 200, pointerId: 1})
  expect(pager).not.toBeVisible()
  fireEvent.pointerUp(window, {clientX: 20, clientY: 200, pointerId: 1})
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  expect(pager).not.toBeVisible()
  finishPageTurn()
  expect(pager).toBeVisible()
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).not.toHaveAttribute('data-turn-phase')
})

it('should turn the visible outgoing page on a compact older turn', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({matches: query === '(width < 48rem)'}))
  renderEditor({
    canGoOlder: true,
    currentEntry: sampleEntry('visible'),
    previousEntry: sampleEntry('incoming'),
  })
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  expect(book.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent('visible')
  expect(
    book.querySelector('.picture-diary-book__spread [data-picture-diary-page="current"]'),
  ).toHaveTextContent('incoming')
})

it('should not fling after holding a partially folded page still', () => {
  const onGoOlder = vi.fn()
  renderEditor({canGoOlder: true, onGoOlder, previousEntry: sampleEntry('previous')})
  const book = screen.getByLabelText('일기장')
  installTurnBounds(book)
  fireEvent.pointerDown(book.querySelector('[data-picture-diary-edge="older"]')!, {
    button: 0,
    clientX: 0,
    clientY: 200,
    pointerId: 1,
  })
  vi.advanceTimersByTime(16)
  fireEvent.pointerMove(window, {clientX: 100, clientY: 200, pointerId: 1})
  vi.advanceTimersByTime(1000)
  fireEvent.pointerUp(window, {clientX: 100, clientY: 200, pointerId: 1})
  finishPageTurn()
  expect(onGoOlder).not.toHaveBeenCalled()
})

it('should complete without animation when reduced motion is requested', () => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
  }))
  const onGoNewer = vi.fn()
  renderEditor({canGoNewer: true, currentEntry: sampleEntry('current'), onGoNewer})
  installTurnBounds(screen.getByLabelText('일기장'))
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(onGoNewer).toHaveBeenCalledExactlyOnceWith()
  expect(screen.getByLabelText('일기장')).not.toHaveAttribute('data-turn-phase')
})

it('should use accessible names without visible section labels or a control-shaped textarea', () => {
  renderEditor()

  const heading = screen.getByLabelText('날짜').closest('.picture-diary-book__heading')

  expect(screen.queryByText('오늘의 그림')).not.toBeInTheDocument()
  expect(screen.queryByText('오늘의 이야기')).not.toBeInTheDocument()
  expect(screen.getByLabelText('그림 그리는 곳')).toBeInTheDocument()
  expect(screen.getByLabelText('그림일기 내용')).not.toHaveClass('rounded-control')
  expect(heading?.querySelector('button')).toBeNull()
  expect(screen.queryByRole('button', {name: '한 획 취소'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '그림 지우기'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '그림 그리기'})).toHaveAttribute(
    'aria-haspopup',
    'dialog',
  )
})

it('should keep drawing and writing together on the current page', () => {
  renderEditor()

  const currentPage = screen
    .getByLabelText('그림일기 내용')
    .closest('[data-picture-diary-page="current"]')
  const drawing = screen.getByLabelText('그림 그리는 곳')
  const saveButton = screen.getByRole('button', {name: '일기 저장'})
  const book = currentPage?.closest('[data-picture-diary-book]')
  const previousPage = book?.querySelector('.picture-diary-book__page--previous')
  const currentFooter = currentPage?.querySelector('.picture-diary-book__footer--current')

  expect(book?.querySelector('[data-picture-diary-cover]')).not.toBeInTheDocument()
  expect(book?.querySelector('[data-picture-diary-page-block]')).not.toBeInTheDocument()
  expect(book?.querySelector('[data-picture-diary-spine]')).not.toBeInTheDocument()
  expect(currentPage).toContainElement(drawing)
  expect(currentFooter).toContainElement(saveButton)
  expect(screen.queryByText('2')).not.toBeInTheDocument()
  expect(previousPage).toHaveClass('picture-diary-book__back-cover--inside')
  expect(previousPage?.querySelector('.picture-diary-book__cover-mark')).toBeInTheDocument()
})

it('should replace the writing page with aligned read-only entries while browsing', () => {
  const onDeleteEntry = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [{points: [{x: 0.75, y: 0.25}]}],
    text: '오늘은 자전거를 탔다.',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
    weather: {condition: 'clear', temperatureCelsius: 24.4},
  } satisfies PictureDiaryEntry
  const previousEntry = {
    ...currentEntry,
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-03',
    id: 'previous-entry',
    text: '어제는 산책했다.',
    updatedAt: '2026-09-03T03:00:00.000Z',
  } satisfies PictureDiaryEntry
  renderEditor({currentEntry, onDeleteEntry, previousEntry})

  const currentPage = screen
    .getByText('오늘은 자전거를 탔다.')
    .closest('[data-picture-diary-page="current"]')
  const previousPage = screen
    .getByText('어제는 산책했다.')
    .closest('[data-picture-diary-page="previous"]')

  expect(screen.queryByLabelText('날짜')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '일기 저장'})).not.toBeInTheDocument()
  expect(currentPage).toHaveAttribute('data-picture-diary-mode', 'read')
  expect(currentPage?.querySelector('.picture-diary-book__heading')).toHaveTextContent(
    '2026. 09. 04.',
  )
  expect(currentPage?.querySelector('.picture-diary-book__weather')).toHaveTextContent('맑음 · 24°')
  expect(previousPage?.querySelector('.picture-diary-book__heading')).toHaveTextContent(
    '2026. 09. 03.',
  )
  expect(previousPage?.querySelector('.picture-diary-book__weather')).toHaveTextContent(
    '맑음 · 24°',
  )
  expect(screen.getAllByLabelText('저장된 일기의 그림')).toHaveLength(2)
  expect(screen.queryByRole('button', {name: '현재 일기 삭제'})).not.toBeInTheDocument()

  const previousDelete = screen.getByRole('button', {name: '2026. 09. 03. 일기 삭제'})
  fireEvent.click(previousDelete)
  expect(onDeleteEntry).not.toHaveBeenCalled()
  expect(previousDelete).toHaveAccessibleName('2026. 09. 03. 일기를 삭제하려면 한 번 더 누르세요.')
  expect(previousDelete).toHaveTextContent('한 번 더 눌러 삭제')
  fireEvent.click(previousDelete)
  expect(onDeleteEntry).toHaveBeenCalledWith('previous-entry')
})

it('should show the previous complete entry and animate turns through diary entries', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [],
    text: '오늘은 자전거를 탔다.',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const previousEntry = {
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-03',
    id: 'previous-entry',
    strokes: [{points: [{x: 0.25, y: 0.5}]}],
    text: '어제는 산책했다.',
    updatedAt: '2026-09-03T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry,
    onGoNewer,
    onGoOlder,
    previousEntry,
  })

  const previousPage = screen
    .getByText('어제는 산책했다.')
    .closest('[data-picture-diary-page="previous"]')
  expect(previousPage).toHaveTextContent('2026. 09. 03.')
  expect(screen.getAllByLabelText('저장된 일기의 그림')).toHaveLength(2)

  const book = screen.getByLabelText('일기장')
  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  const newerButton = screen.getByRole('button', {name: '다음 일기 보기'})
  installTurnBounds(book)

  expect(olderButton).toHaveClass('picture-diary-book__turn--older')
  expect(newerButton).toHaveClass('picture-diary-book__turn--newer')
  expect(olderButton.parentElement).toHaveClass('picture-diary-book__pager')

  fireEvent.click(olderButton)
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'older')
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  vi.advanceTimersByTime(32)
  const olderTurn = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(olderTurn).toBeInTheDocument()
  expect(olderTurn).toHaveAttribute('data-turn-origin', 'bottom')
  expect(olderTurn?.getAttribute('style')).toContain('--picture-diary-flat-clip')
  expect(olderTurn?.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent(
    '어제는 산책했다.',
  )
  expect(olderTurn?.querySelector('[data-picture-diary-turn-face="back"]')).toHaveTextContent(
    '어제는 산책했다.',
  )
  expect(olderButton).toBeDisabled()
  expect(newerButton).toBeDisabled()
  expect(olderButton).not.toBeVisible()
  expect(newerButton).not.toBeVisible()

  finishPageTurn()
  expect(onGoOlder).toHaveBeenCalledOnce()
  expect(book).not.toHaveAttribute('data-turn-direction')
  expect(book.querySelector('[data-picture-diary-turn-sheet]')).not.toBeInTheDocument()

  fireEvent.click(newerButton)
  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'newer')
  const newerTurn = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(newerTurn?.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent(
    '오늘은 자전거를 탔다.',
  )
  finishPageTurn()
  expect(onGoNewer).toHaveBeenCalledOnce()
})

it('should turn pages by dragging and releasing the outer page edges', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [],
    text: '오늘 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const previousEntry = {
    ...currentEntry,
    date: '2026-09-03',
    id: 'previous-entry',
    text: '이전 일기',
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry,
    onGoNewer,
    onGoOlder,
    previousEntry,
  })

  const book = screen.getByLabelText('일기장')
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  const newerEdge = book.querySelector('[data-picture-diary-edge="newer"]')!
  installTurnBounds(book)

  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 180, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 600, clientY: 182, pointerId: 1})
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-phase', 'move')
  const liveFold = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(liveFold?.getAttribute('style')).toContain('--picture-diary-flat-clip')
  expect(liveFold?.getAttribute('style')).toContain('--picture-diary-flap-transform')
  fireEvent.pointerUp(window, {clientX: 600, clientY: 182, pointerId: 1})

  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'older')
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  finishPageTurn()
  expect(onGoOlder).toHaveBeenCalledOnce()

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 180, pointerId: 2})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 178, pointerId: 2})
  fireEvent.pointerUp(window, {clientX: 200, clientY: 178, pointerId: 2})

  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'newer')
  finishPageTurn()
  expect(onGoNewer).toHaveBeenCalledOnce()
})

it('should ignore short, vertical, reversed, and cancelled edge drags', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const entry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'entry',
    strokes: [],
    text: '일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry: entry,
    onGoNewer,
    onGoOlder,
    previousEntry: entry,
  })

  const book = screen.getByLabelText('일기장')
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  const newerEdge = book.querySelector('[data-picture-diary-edge="newer"]')!
  installTurnBounds(book)

  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 100, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 28, clientY: 101, pointerId: 1})
  fireEvent.pointerUp(window, {clientX: 28, clientY: 101, pointerId: 1})
  finishPageTurn()

  fireEvent.pointerDown(olderEdge, {
    button: 0,
    clientX: 8,
    clientY: 100,
    pointerId: 2,
    pointerType: 'touch',
  })
  fireEvent.pointerMove(window, {
    clientX: 13,
    clientY: 190,
    pointerId: 2,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(window, {clientX: 13, clientY: 190, pointerId: 2, pointerType: 'touch'})

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 100, pointerId: 3})
  fireEvent.pointerMove(window, {clientX: 850, clientY: 100, pointerId: 3})
  fireEvent.pointerUp(window, {clientX: 850, clientY: 100, pointerId: 3})
  finishPageTurn()

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 100, pointerId: 4})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 100, pointerId: 4})
  fireEvent.pointerCancel(window, {clientX: 200, clientY: 100, pointerId: 4})
  finishPageTurn()

  expect(onGoOlder).not.toHaveBeenCalled()
  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).not.toHaveAttribute('data-turn-direction')
})

it('should close the back cover after the last entry and reopen it toward that entry', () => {
  const onCloseBackCover = vi.fn()
  const onOpenBackCover = vi.fn()
  const lastEntry = {
    createdAt: '2026-09-01T03:00:00.000Z',
    date: '2026-09-01',
    id: 'last-entry',
    strokes: [],
    text: '가장 오래된 일기',
    updatedAt: '2026-09-01T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const {unmount} = renderEditor({
    canCloseBackCover: true,
    currentEntry: lastEntry,
    onCloseBackCover,
  })

  const book = screen.getByLabelText('일기장')
  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  expect(olderButton).toBeEnabled()
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  installTurnBounds(book)
  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 180, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 600, clientY: 180, pointerId: 1})
  const closingCover = book.querySelector('[data-picture-diary-cover-turn]')
  expect(closingCover).toHaveAttribute('data-turn-direction', 'older')
  expect(closingCover?.getAttribute('style')).toContain('--picture-diary-hard-angle')
  expect(onCloseBackCover).not.toHaveBeenCalled()
  fireEvent.pointerUp(window, {clientX: 600, clientY: 180, pointerId: 1})
  finishPageTurn()
  expect(onCloseBackCover).toHaveBeenCalledOnce()

  unmount()
  renderEditor({
    backCoverClosed: true,
    canGoNewer: true,
    newerEntry: lastEntry,
    onOpenBackCover,
  })

  const closedBook = screen.getByLabelText('일기장')
  const closedSpread = closedBook.querySelector('.picture-diary-book__spread')
  expect(closedBook.closest('.picture-diary-book__frame')).toHaveAttribute(
    'data-picture-diary-cover-closed',
  )
  expect(closedSpread).toHaveClass('picture-diary-book__spread--closed')
  expect(closedSpread?.children).toHaveLength(1)
  expect(closedBook.querySelector('[data-picture-diary-cover="back"]')).toBeInTheDocument()
  const newerButton = screen.getByRole('button', {name: '다음 일기 보기'})
  expect(newerButton).toBeEnabled()
  const newerEdge = closedBook.querySelector('[data-picture-diary-edge="newer"]')!
  installTurnBounds(closedBook)
  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 180, pointerId: 2})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 180, pointerId: 2})
  expect(onOpenBackCover).not.toHaveBeenCalled()
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover-turn]'),
  ).toHaveAttribute('data-turn-direction', 'newer')
  fireEvent.pointerUp(window, {clientX: 200, clientY: 180, pointerId: 2})
  finishPageTurn()
  expect(onOpenBackCover).toHaveBeenCalledOnce()
})
