/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest'
import {createDemoDocument, type PuppetDocument} from '../../../player'
import {EditorTimeline} from '../EditorTimeline'

const createTimeline = (initialDocument?: PuppetDocument) => {
  const base = createDemoDocument()
  const [document, setDocument] = createSignal<PuppetDocument>(
    initialDocument ?? {
      ...base,
      motions: [
        {
          duration: 2,
          id: 'idle',
          timelineParameterIds: ['angle-x', 'angle-y'],
          tracks: [
            {
              keyframes: [
                {time: 0, value: 0},
                {time: 1, value: -30},
                {time: 2, value: 0},
              ],
              kind: 'parameter',
              parameterId: 'angle-y',
            },
          ],
        },
        {duration: 2, id: 'blink', timelineParameterIds: ['angle-x'], tracks: []},
      ],
    },
  )
  const [currentTime, setCurrentTime] = createSignal(1)
  const view = render(() => (
    <EditorTimeline
      document={document()}
      currentTime={currentTime()}
      onDocumentChange={setDocument}
      onSeek={setCurrentTime}
    />
  ))
  return {document, setDocument, view}
}

const mockBounds = (track: HTMLElement) =>
  vi
    .spyOn(track, 'getBoundingClientRect')
    .mockReturnValue(DOMRect.fromRect({height: 38, width: 240}))
const selectMenu = (name: string) =>
  screen
    .getByRole('menuitem', {name})
    .dispatchEvent(new MouseEvent('pointerup', {bubbles: true, button: 0}))

beforeEach(() => {
  const getComputedStyle = globalThis.getComputedStyle
  // JSDOM omits the browser's default animation name, so menu presence cannot finish closing.
  vi.spyOn(globalThis, 'getComputedStyle').mockImplementation((element, pseudoElement) => {
    const styles = getComputedStyle(element, pseudoElement)
    if (styles.animationName === '') {
      Object.defineProperty(styles, 'animationName', {value: 'none'})
    }
    return styles
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('EditorTimeline keyframe editing', () => {
  test('should add a snapped keyframe at the double-clicked position using the value sampled there', () => {
    const {document, view} = createTimeline()
    const track = view.getByLabelText('Angle Y 트랙')
    mockBounds(track)
    fireEvent.dblClick(track, {clientX: 62})
    expect(document().motions[0]?.tracks[0]?.keyframes[1]).toEqual({time: 0.5, value: -15})
    expect(view.getByRole('button', {name: 'Angle Y 0.50초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(track).toHaveFocus()
  })

  test('should leave existing keyframes unchanged on double click', () => {
    const {document, view} = createTimeline()
    const previous = document()
    const track = view.getByLabelText('Angle Y 트랙')
    mockBounds(track)
    fireEvent.dblClick(track, {clientX: 120})
    fireEvent.dblClick(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}), {clientX: 120})
    expect(document()).toBe(previous)
  })

  test('should delete all selected keyframes with Backspace and restore track focus', () => {
    const {document, view} = createTimeline()
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 0.00초 키프레임'}))
    const marker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
    fireEvent.click(marker, {shiftKey: true})
    fireEvent.keyDown(marker, {key: 'Backspace'})
    expect(document().motions[0]?.tracks[0]?.keyframes).toEqual([{time: 2, value: 0}])
    expect(view.getByLabelText('Angle Y 트랙')).toHaveFocus()
  })

  test.each([
    {repeat: true},
    {isComposing: true},
    {ctrlKey: true},
    {metaKey: true},
    {altKey: true},
    {shiftKey: true},
  ])('should ignore deletion chords and repeated or composing keys: %j', (options) => {
    const {document, view} = createTimeline()
    const marker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
    fireEvent.click(marker)
    const previous = document()
    fireEvent.keyDown(marker, {key: 'Backspace', ...options})
    expect(document()).toBe(previous)
  })

  test('should not delete a selected keyframe while typing in a number input or without selection', () => {
    const {document, view} = createTimeline()
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    const previous = document()
    fireEvent.keyDown(view.getByRole('spinbutton', {name: 'Angle Y 현재 값'}), {key: 'Backspace'})
    fireEvent.keyDown(view.getByLabelText('Angle X 트랙'), {key: 'Backspace'})
    expect(document()).toBe(previous)
  })

  test('should add from the empty-position context menu and delete from the marker context menu', () => {
    const {document, view} = createTimeline()
    const track = view.getByLabelText('Angle X 트랙')
    mockBounds(track)
    fireEvent.contextMenu(track, {clientX: 62, clientY: 10})
    expect(screen.queryByRole('menuitem', {name: /키프레임 삭제/})).not.toBeInTheDocument()
    selectMenu('키프레임 추가')
    const marker = view.getByRole('button', {name: 'Angle X 0.50초 키프레임'})
    expect(marker).toHaveAttribute('aria-pressed', 'true')
    fireEvent.contextMenu(marker, {clientX: 62, clientY: 10})
    expect(screen.queryByRole('menuitem', {name: '키프레임 추가'})).not.toBeInTheDocument()
    selectMenu('키프레임 삭제')
    expect(
      document().motions[0]?.tracks.find(
        (track) => track.kind === 'parameter' && track.parameterId === 'angle-x',
      )?.keyframes,
    ).toBeUndefined()
    expect(track).toBeInTheDocument()
  })

  test('should preserve multi-selection when right-clicking a selected keyframe', () => {
    const {document, view} = createTimeline()
    const first = view.getByRole('button', {name: 'Angle Y 0.00초 키프레임'})
    fireEvent.click(first)
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}), {shiftKey: true})
    fireEvent.contextMenu(first, {clientX: 0, clientY: 10})
    selectMenu('키프레임 2개 삭제')
    expect(document().motions[0]?.tracks[0]?.keyframes).toEqual([{time: 2, value: 0}])
  })

  test('should edit the clicked motion in the all-motions view', () => {
    const {document, view} = createTimeline()
    fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})
    const group = view.getByRole('region', {name: 'blink 타임라인'})
    const track = within(group).getByLabelText('Angle X 트랙')
    mockBounds(track)
    fireEvent.dblClick(track, {clientX: 60})
    const marker = within(group).getByRole('button', {name: 'Angle X 0.50초 키프레임'})
    expect(document().motions[1]?.tracks[0]?.keyframes).toEqual([{time: 0.5, value: 0}])
    fireEvent.keyDown(marker, {key: 'Backspace'})
    expect(document().motions[1]?.tracks).toEqual([])
    expect(track).toBeInTheDocument()
    expect(document().motions[0]?.tracks[0]?.keyframes).toHaveLength(3)
  })

  test.each([
    {allMotions: false, contextMenu: false},
    {allMotions: false, contextMenu: true},
    {allMotions: true, contextMenu: false},
    {allMotions: true, contextMenu: true},
  ])(
    'should retain an imported row and its focus after deleting its last keyframe: %j',
    async ({allMotions, contextMenu}) => {
      const {document, view} = createTimeline({
        ...createDemoDocument(),
        motions: [
          {
            duration: 2,
            id: 'idle',
            tracks: [
              {
                keyframes: [{time: 1, value: -30}],
                kind: 'parameter',
                parameterId: 'angle-y',
              },
            ],
          },
        ],
      })
      if (allMotions) {
        fireEvent.keyDown(view.getByRole('button', {name: /모션 선택/}), {key: 'Enter'})
        fireEvent.keyDown(screen.getByRole('option', {name: '모든 타임라인 보기'}), {key: 'Enter'})
      }
      const track = view.getByRole('group', {name: 'Angle Y 트랙'})
      const marker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
      marker.focus()
      fireEvent.click(marker)
      if (contextMenu) {
        fireEvent.contextMenu(marker, {clientX: 120, clientY: 10})
        selectMenu('키프레임 삭제')
      } else {
        fireEvent.keyDown(marker, {key: 'Backspace'})
      }
      expect(document().motions[0]?.tracks).toEqual([])
      expect(track).toBeInTheDocument()
      await waitFor(() => expect(track).toHaveFocus())
      mockBounds(track)
      fireEvent.dblClick(track, {clientX: 60})
      expect(view.getByRole('button', {name: 'Angle Y 0.50초 키프레임'})).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    },
  )

  test.each([{key: 'ContextMenu'}, {key: 'F10', shiftKey: true}])(
    'should open the add menu at the current frame from a focused track: %j',
    (keyOptions) => {
      const {document, view} = createTimeline()
      const track = view.getByRole('group', {name: 'Angle X 트랙'})
      mockBounds(track)
      track.focus()
      fireEvent.keyDown(track, keyOptions)
      expect(screen.getByRole('menu', {name: '키프레임 작업'})).toBeVisible()
      selectMenu('키프레임 추가')
      expect(document().motions[0]?.tracks[1]?.keyframes).toEqual([{time: 1, value: 0}])
      expect(track).toHaveFocus()
    },
  )

  test('should open the keyboard menu for the focused marker instead of the playhead', () => {
    const {document, view} = createTimeline()
    mockBounds(view.getByRole('group', {name: 'Angle Y 트랙'}))
    const marker = view.getByRole('button', {name: 'Angle Y 0.00초 키프레임'})
    marker.focus()
    fireEvent.keyDown(marker, {key: 'F10', shiftKey: true})
    selectMenu('키프레임 삭제')
    expect(document().motions[0]?.tracks[0]?.keyframes).toEqual([
      {time: 1, value: -30},
      {time: 2, value: 0},
    ])
  })

  test('should ignore obsolete keyframe selection after a source document change', () => {
    const {document, setDocument, view} = createTimeline()
    fireEvent.click(view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'}))
    const track = view.getByRole('group', {name: 'Angle Y 트랙'})
    track.focus()
    setDocument({
      ...document(),
      motions: document().motions.map((motion) => ({
        ...motion,
        tracks: motion.tracks.map((track) => ({
          ...track,
          keyframes: track.keyframes.map((keyframe) =>
            keyframe.time === 1 ? {...keyframe, time: 0.5} : keyframe,
          ),
        })),
      })),
    })
    const previous = document()
    expect(view.getByRole('button', {name: 'Angle Y 0.50초 키프레임'})).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    fireEvent.keyDown(track, {key: 'Backspace'})
    expect(document()).toBe(previous)
  })

  test('should update editing availability when the document change callback changes', () => {
    const [editable, setEditable] = createSignal(true)
    const onDocumentChange = vi.fn()
    const view = render(() => (
      <EditorTimeline
        currentTime={1}
        document={createDemoDocument()}
        onDocumentChange={editable() ? onDocumentChange : undefined}
      />
    ))
    const track = view.getByRole('group', {name: 'Angle Y 트랙'})
    mockBounds(track)
    const marker = view.getByRole('button', {name: 'Angle Y 1.00초 키프레임'})
    fireEvent.click(marker)
    setEditable(false)
    fireEvent.keyDown(marker, {key: 'Backspace'})
    fireEvent.contextMenu(track, {clientX: 60})
    fireEvent.dblClick(track, {clientX: 60})
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(onDocumentChange).not.toHaveBeenCalled()
    setEditable(true)
    fireEvent.contextMenu(track, {clientX: 60})
    selectMenu('키프레임 추가')
    expect(onDocumentChange).toHaveBeenCalledOnce()
  })

  test('should expose no editing actions for a read-only timeline', () => {
    const view = render(() => <EditorTimeline document={createDemoDocument()} />)
    const track = view.getByLabelText('Angle Y 트랙')
    mockBounds(track)
    fireEvent.dblClick(track, {clientX: 60})
    fireEvent.keyDown(track, {key: 'F10', shiftKey: true})
    fireEvent.contextMenu(track, {clientX: 60})
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(view.getAllByRole('button', {name: /초 키프레임$/})).toHaveLength(3)
  })
})
