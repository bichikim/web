import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../../../features/picture-diary'
import type {BookPage} from '../../pagination'
import {PictureDiaryEditor} from '../../Editor'
import {createTurnHarness} from './turns'

export const turns = createTurnHarness()

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
  turns.reset()
  vi.stubGlobal('PointerEvent', TestPointerEvent)
})

afterEach(() => {
  cleanup()
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

export const renderEditor = (options: RenderEditorOptions = {}) =>
  render(() => (
    <PictureDiaryEditor
      turnEnvironment={turns.environment}
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

const SETTLED_DURATION = 700
export const finishPageTurn = () => turns.advance(SETTLED_DURATION)

export const sampleEntry = (text: string): PictureDiaryEntry => ({
  createdAt: '2026-09-04T03:00:00.000Z',
  date: '2026-09-04',
  id: text,
  strokes: [],
  text,
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
})
