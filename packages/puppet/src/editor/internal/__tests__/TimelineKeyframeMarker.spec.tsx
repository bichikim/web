/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../../player'
import {useDocumentHistory} from '../../use-document-history'
import {TimelineKeyframeMarker} from '../TimelineKeyframeMarker'
import {getParameterTracks} from '../timeline-keyframe-selection'

test.each(['dispose', 'cancel', 'commit', 'replace'] as const)(
  'should finish a timeline transaction once on %s',
  (end) => {
    const document = createDemoDocument()
    const root = createRoot((dispose) => ({
      dispose,
      history: useDocumentHistory({initialDocument: document}),
    }))
    const track = getParameterTracks(document, document.motions[0]!)[0]!
    const keyframe = track.keyframes[0]!
    const [source, setSource] = createSignal(keyframe)
    const onMove = vi.fn()
    const onEditEnd = vi.fn(root.history.endTransaction)
    const onMovePreviewEnd = vi.fn()
    const view = render(() => (
      <TimelineKeyframeMarker
        duration={2}
        framesPerSecond={30}
        getTime={() => 0.5}
        keyframe={source()}
        parameterName={track.parameter.name}
        selected
        snapTime={(time) => time}
        track={track}
        onEditStart={root.history.beginTransaction}
        onEditEnd={onEditEnd}
        onMove={onMove}
        onMovePreviewEnd={onMovePreviewEnd}
      />
    ))
    const marker = view.getByRole('button')
    fireEvent(marker, new MouseEvent('pointerdown', {bubbles: true, button: 0}))
    if (end === 'replace') {
      setSource({...keyframe, time: 1})
      fireEvent(marker, new MouseEvent('pointerup', {bubbles: true}))
    } else if (end === 'cancel') {
      fireEvent(marker, new MouseEvent('pointercancel', {bubbles: true}))
    } else if (end === 'commit') {
      fireEvent(marker, new MouseEvent('pointerup', {bubbles: true}))
    }
    view.unmount()
    expect(onEditEnd).toHaveBeenCalledOnce()
    expect(onMovePreviewEnd).toHaveBeenCalledOnce()
    expect(onMove).not.toHaveBeenCalled()
    root.history.setDocument({
      ...document,
      viewport: {...document.viewport, width: document.viewport.width + 1},
    })
    expect(root.history.canUndo()).toBe(true)
    expect(root.history.undo()).toBe(true)
    expect(root.history.document()).toBe(document)
    root.dispose()
  },
)
