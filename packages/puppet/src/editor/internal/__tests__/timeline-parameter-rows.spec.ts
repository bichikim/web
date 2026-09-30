import {describe, expect, test} from 'vitest'

import {createDemoDocument, parseDocument} from '../../../player'
import {getParameterTracks} from '../timeline-keyframe-selection'
import {addTimelineParameterRow, removeTimelineParameterRow} from '../timeline-parameter-rows'

describe('timeline parameter rows', () => {
  test('should show keyed parameters without showing every document parameter', () => {
    const document = createDemoDocument()

    expect(
      getParameterTracks(document, document.motions[0]).map((track) => track.parameter.id),
    ).toEqual(['angle-y'])
  })

  test('should persist an explicitly added empty row without changing playback tracks', () => {
    const document = createDemoDocument()
    const added = addTimelineParameterRow(document, 'idle-deform', 'angle-x')!
    const parsed = parseDocument(JSON.stringify(added))

    expect(added.motions[0]?.tracks).toEqual(document.motions[0]?.tracks)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(
        getParameterTracks(parsed.document, parsed.document.motions[0]).map(
          (track) => track.parameter.id,
        ),
      ).toEqual(['angle-x', 'angle-y'])
    }
  })

  test('should delete a row and its keyframes only from the selected motion', () => {
    const document = createDemoDocument()
    const removed = removeTimelineParameterRow(document, 'idle-deform', 'angle-y')!

    expect(getParameterTracks(removed, removed.motions[0])).toEqual([])
    expect(removed.motions[0]?.tracks).toEqual([])
    expect(removed.motions[2]?.tracks).toEqual(document.motions[2]?.tracks)
    expect(removed.parameters).toEqual(document.parameters)
  })

  test('should keep an explicitly added row after its last keyframe is deleted', () => {
    const document = addTimelineParameterRow(createDemoDocument(), 'idle-deform', 'angle-y')!
    const withoutKeyframes = {
      ...document,
      motions: document.motions.map((motion) =>
        motion.id === 'idle-deform' ? {...motion, tracks: []} : motion,
      ),
    }

    expect(
      getParameterTracks(withoutKeyframes, withoutKeyframes.motions[0]).map(
        (track) => track.parameter.id,
      ),
    ).toEqual(['angle-y'])
  })

  test('should remove an explicitly added empty row without changing other motions', () => {
    const document = addTimelineParameterRow(createDemoDocument(), 'idle-deform', 'angle-x')!
    const removed = removeTimelineParameterRow(document, 'idle-deform', 'angle-x')!

    expect(
      getParameterTracks(removed, removed.motions[0]).map((track) => track.parameter.id),
    ).toEqual(['angle-y'])
    expect(removed.motions[0]?.timelineParameterIds).toEqual([])
    expect(removed.motions[1]).toEqual(document.motions[1])
  })
})
